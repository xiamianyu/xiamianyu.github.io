// 代码复制功能
$(document).ready(function() {
    // 为每个代码块添加复制按钮
    $('pre').each(function() {
        var $pre = $(this);
        
        // 创建复制按钮
        var $copyButton = $('<button class="code-copy-btn" title="复制代码">复制</button>');
        
        // 将按钮添加到代码块
        $pre.wrap('<div class="code-block-wrapper"></div>');
        $pre.parent().append($copyButton);
        
        // 复制功能
        $copyButton.on('click', function() {
            // 使用更可靠的方法获取代码文本，保留换行符
            var codeText = getCodeTextWithLineBreaks($pre);
            
            // 使用现代 Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(codeText).then(function() {
                    // 复制成功
                    $copyButton.text('已复制');
                    setTimeout(function() {
                        $copyButton.text('复制');
                    }, 2000);
                }).catch(function(err) {
                    // 如果 Clipboard API 失败，使用备用方法
                    copyToClipboardFallback(codeText, $copyButton);
                });
            } else {
                // 使用备用方法
                copyToClipboardFallback(codeText, $copyButton);
            }
        });
    });
});

// 获取保留换行符的代码文本
function getCodeTextWithLineBreaks($pre) {
    // 方法1: 尝试获取原始HTML内容并处理
    var htmlContent = $pre.html();
    
    // 处理常见的HTML实体和标签
    var text = htmlContent
        .replace(/<br\s*\/?>/gi, '\n') // 将<br>标签转换为换行符
        .replace(/<\/div>/gi, '\n')    // 将div结束标签转换为换行符
        .replace(/<\/p>/gi, '\n')      // 将p结束标签转换为换行符
        .replace(/&nbsp;/g, ' ')       // 将空格实体转换为普通空格
        .replace(/</g, '<')         // 将<实体转换为<
        .replace(/>/g, '>')         // 将>实体转换为>
        .replace(/&/g, '&')        // 将&实体转换为&
        .replace(/<[^>]*>/g, '');      // 移除所有HTML标签
    
    // 保留所有换行符和空行，只移除开头和结尾的空白
    text = text.trim();
    
    // 如果处理后内容为空，回退到原始text()方法
    if (!text) {
        text = $pre.text();
    }
    
    return text;
}

// 备用复制方法
function copyToClipboardFallback(text, $button) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        var successful = document.execCommand('copy');
        if (successful) {
            $button.text('已复制');
            setTimeout(function() {
                $button.text('复制');
            }, 2000);
        } else {
            $button.text('复制失败');
            setTimeout(function() {
                $button.text('复制');
            }, 2000);
        }
    } catch (err) {
        $button.text('复制失败');
        setTimeout(function() {
            $button.text('复制');
        }, 2000);
    }
    
    document.body.removeChild(textArea);
}