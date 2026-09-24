(() => {
    "use strict";

    function initPortfolio() {
        const root = document.documentElement;
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        root.classList.add("js");

        function onMediaChange(query, callback) {
            if (query?.addEventListener) query.addEventListener("change", callback);
            else if (query?.addListener) query.addListener(callback);
        }

        // Start in the portfolio's dark theme until a visitor makes a choice.
        const themeButton = document.getElementById("theme-toggle");
        const themeColor = document.querySelector('meta[name="theme-color"]');
        let themePreference = null;

        function readTheme(value) {
            return value === "light" || value === "dark" ? value : null;
        }

        try {
            themePreference = readTheme(localStorage.getItem("portfolio-theme"));
        } catch {
            // Private browsing and blocked storage still allow an in-session choice.
        }

        function applyTheme() {
            const theme = themePreference || "dark";
            root.dataset.theme = theme;
            root.style.colorScheme = theme;
            themeColor?.setAttribute("content", theme === "dark" ? "#080a0f" : "#f3f4f6");
            if (themeButton) {
                const label = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;
                themeButton.setAttribute("aria-label", label);
                themeButton.setAttribute("title", label);
            }
        }

        applyTheme();
        themeButton?.addEventListener("click", () => {
            themePreference = root.dataset.theme === "dark" ? "light" : "dark";
            applyTheme();
            try {
                localStorage.setItem("portfolio-theme", themePreference);
            } catch {
                // The page has already applied the requested theme.
            }
        });
        window.addEventListener("storage", (event) => {
            if (event.key === "portfolio-theme" || event.key === null) {
                themePreference = readTheme(event.newValue);
                applyTheme();
            }
        });

        const nav = document.querySelector(".site-nav");
        const navToggle = document.querySelector(".nav-toggle");
        const navLinks = document.getElementById("site-nav-links");
        const mobileQuery = window.matchMedia?.("(max-width: 800px)");

        function focusSection(link) {
            const target = document.getElementById(link.getAttribute("href").slice(1));
            if (!target) return;
            if (!target.hasAttribute("tabindex")) {
                target.setAttribute("tabindex", "-1");
                target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
            }
            target.focus({ preventScroll: true });
        }

        function closeMobileNav(restoreFocus = false) {
            if (!navToggle || !navLinks) return;
            navToggle.setAttribute("aria-expanded", "false");
            navToggle.setAttribute("aria-label", "Open navigation");
            navLinks.classList.remove("active");
            if (restoreFocus) navToggle.focus();
        }

        if (navToggle && navLinks) {
            closeMobileNav();
            navToggle.addEventListener("click", () => {
                const isOpen = navToggle.getAttribute("aria-expanded") !== "true";
                navToggle.setAttribute("aria-expanded", String(isOpen));
                navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
                navLinks.classList.toggle("active", isOpen);
            });
            navLinks.querySelectorAll('a[href^="#"]').forEach((link) => {
                // Let native anchors preserve URL hashes, history, and keyboard behavior.
                link.addEventListener("click", (event) => {
                    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                    const wasOpen = navToggle.getAttribute("aria-expanded") === "true";
                    closeMobileNav();
                    if (wasOpen) window.requestAnimationFrame(() => focusSection(link));
                });
            });
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
                    closeMobileNav(true);
                }
            });
            document.addEventListener("click", (event) => {
                if (!navLinks.contains(event.target) && !navToggle.contains(event.target)) closeMobileNav();
            });
            onMediaChange(mobileQuery, () => closeMobileNav());
        }

        const sectionLinks = Array.from(navLinks?.querySelectorAll('a[href^="#"]') || [])
            .map((link) => ({ link, section: document.getElementById(link.getAttribute("href").slice(1)) }))
            .filter(({ section }) => section);
        const progress = document.querySelector(".scroll-progress");
        let scrollFrame = 0;

        function updateScrollState() {
            scrollFrame = 0;
            nav?.classList.toggle("is-scrolled", window.scrollY > 12);
            const maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
            if (progress) {
                const fraction = maxScroll ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
                progress.style.transform = `scaleX(${fraction})`;
            }

            if (!sectionLinks.length) return;
            const readingLine = (nav?.getBoundingClientRect().bottom || 0) + 80;
            let activeSection = sectionLinks[0].section;
            for (const { section } of sectionLinks) {
                if (section.getBoundingClientRect().top <= readingLine) activeSection = section;
            }
            if (maxScroll > 0 && window.scrollY >= maxScroll - 4) {
                activeSection = sectionLinks[sectionLinks.length - 1].section;
            }
            sectionLinks.forEach(({ link, section }) => {
                const active = section === activeSection;
                link.classList.toggle("is-active", active);
                if (active) link.setAttribute("aria-current", "location");
                else link.removeAttribute("aria-current");
            });
        }

        function scheduleScrollUpdate() {
            if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState);
        }

        window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
        window.addEventListener("resize", scheduleScrollUpdate);
        window.addEventListener("load", scheduleScrollUpdate);
        updateScrollState();

        const filterButtons = Array.from(document.querySelectorAll("button[data-filter]"));
        const projectItems = Array.from(document.querySelectorAll(".project-item[data-category]"));
        const projectStatus = document.getElementById("project-status");

        function filterProjects(filter) {
            let shown = 0;
            projectItems.forEach((project) => {
                const categories = project.dataset.category.split(/\s+/);
                const matches = filter === "all" || categories.includes(filter);
                project.hidden = !matches;
                if (matches) shown += 1;
            });
            filterButtons.forEach((button) => {
                const active = button.dataset.filter === filter;
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-pressed", String(active));
            });
            if (projectStatus) {
                projectStatus.textContent = `Showing ${shown} of ${projectItems.length} projects`;
            }
            scheduleScrollUpdate();
        }

        if (filterButtons.length && projectItems.length) {
            filterButtons.forEach((button) => {
                button.addEventListener("click", () => filterProjects(button.dataset.filter));
            });
            filterProjects("all");
        }

        // Certificate links still open their image when dialog support is absent.
        const modal = document.getElementById("cert-modal");
        const modalImage = document.getElementById("cert-modal-img");
        const modalTitle = document.getElementById("cert-modal-title");
        let certificateTrigger = null;

        if (modal && modalImage && typeof modal.showModal === "function") {
            document.querySelectorAll("a.certificate-card[data-cert-src]").forEach((card) => {
                card.addEventListener("click", (event) => {
                    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                    const source = card.dataset.certSrc || card.getAttribute("href");
                    if (!source) return;
                    modalImage.src = source;
                    modalImage.alt = card.dataset.certAlt || "Certificate";
                    if (modalTitle) {
                        modalTitle.textContent = card.dataset.certTitle || card.querySelector("h3, h4")?.textContent || "Certificate preview";
                    }
                    try {
                        modal.showModal();
                    } catch {
                        return;
                    }
                    event.preventDefault();
                    certificateTrigger = card;
                    document.body.classList.add("modal-open");
                    modal.querySelector("[data-close-modal]")?.focus();
                });
            });
            modal.querySelectorAll("[data-close-modal]").forEach((button) => {
                button.addEventListener("click", () => modal.close());
            });
            let backdropPointerDown = false;
            function isOutsideDialog(event) {
                const bounds = modal.getBoundingClientRect();
                return event.target === modal && (
                    event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom
                );
            }
            modal.addEventListener("pointerdown", (event) => {
                backdropPointerDown = isOutsideDialog(event);
            });
            modal.addEventListener("click", (event) => {
                if (backdropPointerDown && isOutsideDialog(event)) modal.close();
                backdropPointerDown = false;
            });
            // Native Escape and close buttons share cleanup and focus restoration.
            modal.addEventListener("close", () => {
                document.body.classList.remove("modal-open");
                modalImage.removeAttribute("src");
                modalImage.alt = "";
                if (certificateTrigger?.isConnected) certificateTrigger.focus({ preventScroll: true });
                certificateTrigger = null;
            });
        }

        const quickNav = document.getElementById("quick-nav-dialog");
        const quickInput = document.getElementById("quick-nav-input");
        const quickResults = document.getElementById("quick-nav-results");
        const quickEmpty = document.getElementById("quick-nav-empty");
        const quickOpeners = document.querySelectorAll("[data-open-quick-nav]");

        if (quickNav && quickInput && quickResults && typeof quickNav.showModal === "function") {
            const links = Array.from(quickResults.querySelectorAll('a[href^="#"]'));
            let quickTrigger = null;
            let selectedLink = null;

            function resultContainer(link) {
                const listItem = link.closest("li");
                return listItem && quickResults.contains(listItem) ? listItem : link;
            }

            function visibleLinks() {
                return links.filter((link) => !resultContainer(link).hidden);
            }

            function filterNavigation() {
                const words = quickInput.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
                links.forEach((link) => {
                    const text = `${link.textContent} ${link.dataset.search || ""}`.toLocaleLowerCase();
                    resultContainer(link).hidden = !words.every((word) => text.includes(word));
                });
                if (quickEmpty) quickEmpty.hidden = visibleLinks().length > 0;
            }

            function openQuickNav(trigger) {
                if (quickNav.open || modal?.open) return;
                closeMobileNav();
                quickTrigger = trigger;
                selectedLink = null;
                quickInput.value = "";
                filterNavigation();
                quickNav.showModal();
                document.body.classList.add("modal-open");
                quickInput.focus({ preventScroll: true });
            }

            quickOpeners.forEach((button) => {
                button.addEventListener("click", () => openQuickNav(button));
            });
            quickNav.querySelectorAll("[data-close-quick-nav]").forEach((button) => {
                button.addEventListener("click", () => quickNav.close());
            });
            quickInput.addEventListener("input", filterNavigation);

            document.addEventListener("keydown", (event) => {
                if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "k" || modal?.open) return;
                event.preventDefault();
                if (event.repeat) return;
                if (quickNav.open) quickNav.close();
                else openQuickNav(document.activeElement);
            });

            quickNav.addEventListener("keydown", (event) => {
                const currentLinks = visibleLinks();
                if (event.key === "Enter" && event.target === quickInput) {
                    event.preventDefault();
                    currentLinks[0]?.click();
                    return;
                }
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                const currentIndex = currentLinks.indexOf(document.activeElement);
                if (event.target !== quickInput && currentIndex === -1) return;
                event.preventDefault();
                if (!currentLinks.length) return;
                if (event.key === "ArrowDown") {
                    currentLinks[(currentIndex + 1) % currentLinks.length].focus();
                } else if (currentIndex === 0) {
                    quickInput.focus();
                } else {
                    currentLinks[currentIndex === -1 ? currentLinks.length - 1 : currentIndex - 1].focus();
                }
            });

            links.forEach((link) => {
                link.addEventListener("click", (event) => {
                    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                    selectedLink = link;
                    quickNav.close();
                    // The anchor's default action owns scrolling and browser history.
                });
            });

            let backdropPointerDown = false;
            function isOutsideQuickNav(event) {
                const bounds = quickNav.getBoundingClientRect();
                return event.target === quickNav && (
                    event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom
                );
            }
            quickNav.addEventListener("pointerdown", (event) => {
                backdropPointerDown = isOutsideQuickNav(event);
            });
            quickNav.addEventListener("click", (event) => {
                if (backdropPointerDown && isOutsideQuickNav(event)) quickNav.close();
                backdropPointerDown = false;
            });
            quickNav.addEventListener("close", () => {
                if (!modal?.open) document.body.classList.remove("modal-open");
                if (selectedLink) focusSection(selectedLink);
                else if (quickTrigger?.isConnected) quickTrigger.focus({ preventScroll: true });
                quickTrigger = null;
                selectedLink = null;
            });
        } else {
            quickOpeners.forEach((button) => { button.hidden = true; });
        }

        const copyButton = document.getElementById("copy-email");
        const copyStatus = document.getElementById("copy-status");
        copyButton?.addEventListener("click", async () => {
            const email = copyButton.dataset.email;
            if (!email) return;
            copyButton.disabled = true;
            if (copyStatus) copyStatus.textContent = "";
            try {
                if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
                await navigator.clipboard.writeText(email);
                if (copyStatus) copyStatus.textContent = "Email address copied.";
            } catch {
                if (copyStatus) copyStatus.textContent = `Copy unavailable. Select and copy: ${email}`;
            } finally {
                copyButton.disabled = false;
            }
        });

        const year = document.getElementById("current-year");
        if (year) year.textContent = String(new Date().getFullYear());

        // Content starts visible. Hiding is enabled only after observation is available.
        if ("IntersectionObserver" in window && !reducedMotion?.matches) {
            const revealItems = document.querySelectorAll(".reveal");
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });
            root.classList.add("reveal-ready");
            revealItems.forEach((item) => observer.observe(item));
            onMediaChange(reducedMotion, () => {
                if (!reducedMotion.matches) return;
                root.classList.remove("reveal-ready");
                observer.disconnect();
            });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPortfolio, { once: true });
    else initPortfolio();
})();
