'use strict';

(function() {
  const PATH = '/search.xml';
  let index = null;
  let loading = false;
  let loadError = null;
  let prevFocus = null;
  let prevBodyOverflow = '';
  let prevBodyPaddingRight = '';
  let overlayHistoryActive = false;
  let popstateHandler = null;

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeReg = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const debounce = (fn, wait = 200) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const parseXML = (text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const entries = Array.from(doc.getElementsByTagName('entry'));
    return entries.map(e => ({
      title: (e.getElementsByTagName('title')[0]?.textContent || '').trim(),
      content: (e.getElementsByTagName('content')[0]?.textContent || '').trim(),
      url: (e.getElementsByTagName('url')[0]?.textContent || '').trim()
    }));
  };

  const loadIndex = async (path) => {
    if (index || loading) return index;
    loading = true;
    try {
      const res = await fetch(path, { headers: { 'Accept': 'application/xml' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      index = parseXML(text);
    } catch (e) {
      loadError = e;
    } finally {
      loading = false;
    }
    return index;
  };

  const stripHTML = s => s.replace(/<[^>]+>/g, '');

  const searchEntries = (query, entries) => {
    const keywords = query.trim().toLowerCase().split(/[\s\-]+/).filter(Boolean);
    if (!keywords.length) return [];
    const results = [];

    entries.forEach(data => {
      const title = (data.title || 'Untitled').trim();
      const contentRaw = stripHTML(data.content || '');
      if (!contentRaw) return; // skip empty
      const titleLC = title.toLowerCase();
      const contentLC = contentRaw.toLowerCase();

      let isMatch = true;
      let firstOccur = -1;

      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i];
        const it = titleLC.indexOf(kw);
        const ic = contentLC.indexOf(kw);
        if (it < 0 && ic < 0) { isMatch = false; break; }
        if (i === 0) firstOccur = ic >= 0 ? ic : 0;
      }
      if (!isMatch) return;

      // snippet around first occurrence
      let start = Math.max(firstOccur - 20, 0);
      let snippet = contentRaw.slice(start, start + 100);

      // highlight keywords in title and snippet
      keywords.forEach(kw => {
        const re = new RegExp(escapeReg(kw), 'gi');
        snippet = snippet.replace(re, m => '<span class="search-keyword">' + m + '</span>');
      });

      results.push({ title, url: data.url, snippet });
    });

    return results;
  };

  const renderResults = (results, container, i18nNoResult) => {
    if (!results.length) {
      container.innerHTML = `<ul><span class='local-search-empty'>${i18nNoResult || '没有找到内容，请尝试更换检索词。'}</span></ul>`;
      return;
    }
    let html = '<ul class="search-result-list">';
    results.forEach(r => {
      html += `<li><a href='${r.url}' class='search-result-title'><h2>${r.title}</h2></a>`;
      if (r.snippet) html += `<h3 class="search-result-abstract">${r.snippet}...</h3>`;
      html += '<hr></li>';
    });
    html += '</ul>';
    container.innerHTML = html;
  };

  const setupOverlay = () => {
    const trigger = qs('#search-icon a') || qs('#search-icon');
    const overlay = qs('.search-overlay');
    const content = qs('.search-content', overlay);
    const input = qs('#search-input', overlay);
    const closeBtn = qs('#search-close-icon a') || qs('#search-close-icon');
    const result = qs('#search-result', overlay);

    if (!overlay || !input || !result || !trigger || !content) return;
    result.setAttribute('aria-live', 'polite');

    const i18nNoResult = result.getAttribute('data-i18n-noresult');
    const i18nFilesNotfound = result.getAttribute('data-i18n-files-notfound');
    const i18nServiceErrors = result.getAttribute('data-i18n-service-errors');

    const focusablesSel = 'a[href], area[href], input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let keyHandler = null;
    let clickOutsideHandler = null;

    const open = async () => {
      prevFocus = document.activeElement;
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      trigger && trigger.setAttribute('aria-expanded', 'true');
      // lock body scroll
      prevBodyOverflow = document.body.style.overflow;
      prevBodyPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      setTimeout(() => input.focus(), 0);

      // handle mobile back key via History API
      if (!overlayHistoryActive && window.history && window.history.pushState) {
        try {
          window.history.pushState({ searchOverlay: true }, '');
          popstateHandler = (event) => {
            if (overlayHistoryActive) {
              // close triggered by back
              close({ fromPopstate: true });
            }
          };
          window.addEventListener('popstate', popstateHandler);
          overlayHistoryActive = true;
        } catch (e) {}
      }

      keyHandler = async (e) => {
        if (e.key === 'Escape') {
          e.preventDefault(); close(); return;
        }
        if (e.key === 'Tab') {
          const nodes = qsa(focusablesSel, overlay);
          if (!nodes.length) return;
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener('keydown', keyHandler);

      clickOutsideHandler = (e) => { if (!content.contains(e.target)) close(); };
      overlay.addEventListener('click', clickOutsideHandler);
    };

    const close = (opts) => {
      const fromPopstate = !!(opts && opts.fromPopstate);
      document.removeEventListener('keydown', keyHandler);
      overlay.removeEventListener('click', clickOutsideHandler);
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      trigger && trigger.setAttribute('aria-expanded', 'false');
      input.value = '';
      result.innerHTML = '';
      // restore body scroll
      document.body.style.overflow = prevBodyOverflow || '';
      document.body.style.paddingRight = prevBodyPaddingRight || '';
      // clean popstate handler
      if (overlayHistoryActive) {
        window.removeEventListener('popstate', popstateHandler);
        overlayHistoryActive = false;
        if (!fromPopstate && window.history && window.history.state && window.history.back) {
          // pop the pushed state when closed by UI
          try { window.history.back(); } catch (e) {}
        }
      }
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };

    trigger.addEventListener('click', (e) => { e.preventDefault(); open(); });
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); close(); });

    clickOutsideHandler = (e) => { if (!content.contains(e.target)) close(); };
    overlay.addEventListener('click', clickOutsideHandler);

    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) { result.innerHTML = ''; return; }
      if (!index && !loading) {
        result.innerHTML = "<ul><span class='local-search-empty'>首次搜索，正在载入索引文件，请稍后……</span></ul>";
        await loadIndex(PATH);
        if (!index) {
          const msg = loadError && /404/.test(loadError.message) ? i18nFilesNotfound : i18nServiceErrors;
          result.innerHTML = `<ul><span class='local-search-empty'>${msg || '搜索服务异常，请稍后再试。'}</span></ul>`;
          return;
        }
      }
      const results = searchEntries(q, index);
      renderResults(results, result, i18nNoResult);
    };

    input.addEventListener('input', debounce(doSearch, 250));
  };

  document.addEventListener('DOMContentLoaded', setupOverlay);

  // Backward compatibility globals
  window.getSearchFile = function() { loadIndex(PATH); };
  window.searchFunc = function(path, search_id, content_id) {
    // Legacy no-op wrapper: initialize if elements exist
    setupOverlay();
  };
})();