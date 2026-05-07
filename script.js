(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const nav = document.querySelector(".site-nav");
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");

    function closeMobileNav() {
        if (!navToggle || !navLinks) return;
        navToggle.setAttribute("aria-expanded", "false");
        navLinks.classList.remove("active");
    }

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", () => {
            const open = navToggle.getAttribute("aria-expanded") === "true";
            navToggle.setAttribute("aria-expanded", String(!open));
            navLinks.classList.toggle("active", !open);
        });

        navLinks.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener("click", () => closeMobileNav());
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", function (e) {
            const id = this.getAttribute("href");
            if (!id || id === "#") return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const top =
                target.getBoundingClientRect().top +
                window.scrollY -
                (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72);
            window.scrollTo({ top, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
        });
    });

    window.addEventListener(
        "scroll",
        () => {
            if (!nav) return;
            nav.classList.toggle("is-scrolled", window.scrollY > 8);
        },
        { passive: true }
    );

    const progressEl = document.querySelector(".scroll-progress");
    function updateScrollProgress() {
        if (!progressEl) return;
        const doc = document.documentElement;
        const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
        const t = Math.min(1, Math.max(0, window.scrollY / maxScroll));
        progressEl.style.transform = `scaleX(${t})`;
    }
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);
    updateScrollProgress();

    const revealEls = document.querySelectorAll(".animate-on-scroll");
    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add("visible");
            });
        },
        { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    const siteFooter = document.querySelector(".site-footer");
    if (siteFooter) {
        const footerIo = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        siteFooter.classList.add("is-in-view");
                        footerIo.unobserve(siteFooter);
                    }
                });
            },
            { threshold: 0.08, rootMargin: "0px 0px 24px 0px" }
        );
        footerIo.observe(siteFooter);
    }

    function initTilt(selector, maxDeg) {
        if (prefersReducedMotion.matches || window.matchMedia("(hover: none)").matches) return;
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((el) => {
            let raf = 0;
            function onMove(e) {
                if (raf) cancelAnimationFrame(raf);
                const ev = e;
                raf = requestAnimationFrame(() => {
                    const rect = el.getBoundingClientRect();
                    const px = (ev.clientX - rect.left) / rect.width - 0.5;
                    const py = (ev.clientY - rect.top) / rect.height - 0.5;
                    el.style.setProperty("--tilt-y", `${(-px * maxDeg).toFixed(3)}deg`);
                    el.style.setProperty("--tilt-x", `${(py * maxDeg).toFixed(3)}deg`);
                });
            }
            function reset() {
                if (raf) cancelAnimationFrame(raf);
                el.style.setProperty("--tilt-x", "0deg");
                el.style.setProperty("--tilt-y", "0deg");
            }
            el.addEventListener("mousemove", onMove, { passive: true });
            el.addEventListener("mouseleave", reset);
        });
    }
    initTilt(".project-item", 11);
    initTilt(".certificate-card", 9);
    initTilt(".experience-card", 10);

    const modal = document.getElementById("cert-modal");
    const modalImg = document.getElementById("cert-modal-img");
    let lastFocus = null;

    function openCertModal(src, alt) {
        if (!modal || !modalImg) return;
        lastFocus = document.activeElement;
        modalImg.src = src;
        modalImg.alt = alt || "Certificate";
        modal.hidden = false;
        document.body.style.overflow = "hidden";
        modalImg.style.animation = "none";
        void modalImg.offsetHeight;
        modalImg.style.animation = "";
        modal.querySelector(".cert-modal__close")?.focus();
    }

    function closeCertModal() {
        if (!modal || !modalImg) return;
        modal.hidden = true;
        modalImg.src = "";
        modalImg.alt = "";
        document.body.style.overflow = "";
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    document.querySelectorAll(".certificate-card").forEach((card) => {
        const src = card.dataset.certSrc;
        const alt = card.dataset.certAlt || "";
        if (!src) return;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", alt ? `${alt}. Open enlarged view.` : "Open certificate, enlarged view.");

        card.addEventListener("click", () => openCertModal(src, alt));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openCertModal(src, alt);
            }
        });
    });

    modal?.querySelectorAll("[data-close-modal]").forEach((el) => {
        el.addEventListener("click", closeCertModal);
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && !modal.hidden) closeCertModal();
    });

    const contactForm = document.querySelector("form");
    if (contactForm) {
        contactForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const nameInput = document.querySelector('input[placeholder="Your Name"]');
            const emailInput = document.querySelector('input[placeholder="Your Email"]');
            const messageInput = document.querySelector('textarea[placeholder="Your Message"]');
            const name = nameInput?.value.trim() ?? "";
            const email = emailInput?.value.trim() ?? "";
            const message = messageInput?.value.trim() ?? "";
            if (!name || !email || !message) {
                alert("Please fill in all fields.");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert("Please enter a valid email address.");
                return;
            }
            alert("Message sent successfully!");
            contactForm.reset();
        });
    }
})();
