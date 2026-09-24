// Apply a saved theme before the stylesheet paints. Dark is the portfolio default.
(() => {
    try {
        const theme = localStorage.getItem('portfolio-theme');
        if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    } catch { /* A blocked storage area should not prevent the page from loading. */ }
})();
