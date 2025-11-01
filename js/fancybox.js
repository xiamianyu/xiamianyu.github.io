(function() {
  function wrapImages() {
    var imgs = document.querySelectorAll('.markdown-body img');
    imgs.forEach(function(img) {
      if (img.parentElement && img.parentElement.tagName.toLowerCase() === 'a') {
        return;
      }
      var a = document.createElement('a');
      a.setAttribute('data-fancybox', 'gallery');
      a.setAttribute('style', 'text-decoration: none; outline: none; border: 0');
      var src = img.getAttribute('data-original') || img.getAttribute('src');
      if (src) a.setAttribute('href', src);
      img.parentNode.insertBefore(a, img);
      a.appendChild(img);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    wrapImages();
    if (window.Fancybox && typeof window.Fancybox.bind === 'function') {
      window.Fancybox.bind('.markdown-body a[data-fancybox="gallery"]', {
        Thumbs: false
      });
    }
  });
})();