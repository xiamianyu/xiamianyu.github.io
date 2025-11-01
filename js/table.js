document.addEventListener('DOMContentLoaded', function() {
    function wrapTables() {
        const tables = document.querySelectorAll('.post .content table');
        tables.forEach(function(table) {
            if (table.parentNode.classList.contains('table-container')) {
                return;
            }
            const container = document.createElement('div');
            container.className = 'table-container';
            table.parentNode.insertBefore(container, table);
            container.appendChild(table);
        });
    }
    
    wrapTables();
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                wrapTables();
            }
        });
    });
    
    const contentElement = document.querySelector('.post .content');
    if (contentElement) {
        observer.observe(contentElement, {
            childList: true,
            subtree: true
        });
    }
    
    window.addEventListener('resize', function() {
        wrapTables();
    });
});