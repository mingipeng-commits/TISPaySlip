// ============================================================
// TIS Back Office Portal — Shared Navigation Bar
// ============================================================
(function() {
    const PORTAL_VERSION = '3.1.0';
    const modules = [
        { id: 'payslip',  label: '薪資條管理', path: '/modules/payslip/' },
        { id: 'people',   label: '人事管理',   path: '/modules/people/' },
        { id: 'expense',  label: '費用報銷',   path: '/modules/expense/' },
        { id: 'invoice',  label: '發票管理',   path: '/modules/invoice/' },
        { id: 'tax',      label: '稅務申報',   path: '/modules/tax/' },
        { id: 'sales',    label: '營收管理',   path: '/modules/sales/' },
        { id: 'cashflow', label: '金流管理',   path: '/modules/cashflow/' },
    ];

    // Detect current module
    const currentPath = window.location.pathname;
    let currentModule = '';
    for (const m of modules) {
        if (currentPath.startsWith(m.path)) { currentModule = m.id; break; }
    }

    // Build nav HTML
    const linksHtml = modules.map(m => {
        const cls = m.id === currentModule ? ' class="active"' : '';
        return '<a href="' + m.path + '"' + cls + '>' + m.label + '</a>';
    }).join('');

    const navHtml =
        '<div class="portal-nav">' +
            '<a href="/" class="portal-brand"><span class="brand-icon">&#127970;</span> TIS Back Office</a>' +
            '<div class="portal-links">' + linksHtml + '</div>' +
            '<div class="portal-info"><span class="portal-version">v' + PORTAL_VERSION + '</span></div>' +
        '</div>';

    const container = document.getElementById('portal-nav');
    if (container) {
        container.innerHTML = navHtml;
    }
})();
