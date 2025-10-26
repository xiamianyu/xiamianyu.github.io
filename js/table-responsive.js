// 表格响应式处理脚本
document.addEventListener('DOMContentLoaded', function() {
    // 为所有markdown表格添加滚动容器
    function wrapTables() {
        const tables = document.querySelectorAll('.post .content table');
        
        tables.forEach(function(table) {
            // 如果表格已经有容器，跳过
            if (table.parentNode.classList.contains('table-container')) {
                return;
            }
            
            // 创建滚动容器
            const container = document.createElement('div');
            container.className = 'table-container';
            
            // 将表格包装在容器中
            table.parentNode.insertBefore(container, table);
            container.appendChild(table);
        });
    }
    
    // 初始包装表格
    wrapTables();
    
    // 监听内容变化（适用于动态加载的内容）
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                wrapTables();
            }
        });
    });
    
    // 观察文章内容区域的变化
    const contentElement = document.querySelector('.post .content');
    if (contentElement) {
        observer.observe(contentElement, {
            childList: true,
            subtree: true
        });
    }
    
    // 窗口大小变化时重新检查表格
    window.addEventListener('resize', function() {
        wrapTables();
    });
});