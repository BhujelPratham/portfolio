(() => {
    "use strict";

    function initOrbitalArtwork() {
        const canvas = document.getElementById("orbital-canvas");
        const stage = canvas?.closest(".orbital-stage");
        const motionButton = document.getElementById("motion-toggle");
        if (!canvas || !stage) return;

        let context;
        try {
            context = canvas.getContext("2d", { alpha: true });
        } catch {
            // The surrounding HTML remains usable if canvas is unavailable.
        }
        if (!context) {
            if (motionButton) motionButton.hidden = true;
            return;
        }

        const root = document.documentElement;
        const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        const pointerQuery = window.matchMedia?.("(hover: hover) and (pointer: fine)");
        const tau = Math.PI * 2;
        const frameInterval = 1000 / 30;
        let paused = Boolean(motionQuery?.matches);
        let manuallyPaused = false;
        let inView = true;
        let frame = 0;
        let lastFrameTime = 0;
        let elapsed = 0;
        let width = 1;
        let height = 1;
        let radius = 1;
        let pixelRatio = 1;
        let bounds;
        let light = root.dataset.theme === "light";
        const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

        function mediaListener(query, listener) {
            if (query?.addEventListener) query.addEventListener("change", listener);
            else if (query?.addListener) query.addListener(listener);
        }

        // Geometry is built once. Animation only projects these points.
        const latitudePaths = [];
        const longitudePaths = [];
        const orbitPaths = [];
        function makePath(pointAt, steps = 96) {
            return Array.from({ length: steps + 1 }, (_, index) => pointAt(index / steps * tau));
        }
        for (let index = -6; index <= 6; index += 1) {
            const latitude = index * Math.PI / 15;
            const ringRadius = Math.cos(latitude);
            latitudePaths.push(makePath((angle) => [
                Math.cos(angle) * ringRadius,
                Math.sin(latitude),
                Math.sin(angle) * ringRadius,
            ]));
        }
        for (let index = 0; index < 12; index += 1) {
            const longitude = index / 12 * Math.PI;
            longitudePaths.push(makePath((angle) => [
                Math.cos(angle) * Math.cos(longitude),
                Math.sin(angle),
                Math.cos(angle) * Math.sin(longitude),
            ]));
        }
        function orbitPoint(angle, size, tilt) {
            return [Math.cos(angle) * size, Math.sin(angle) * Math.sin(tilt) * size, Math.sin(angle) * Math.cos(tilt) * size];
        }
        orbitPaths.push(makePath((angle) => orbitPoint(angle, 1.41, 0.1), 144));
        orbitPaths.push(makePath((angle) => orbitPoint(angle, 1.25, 1.03), 144));

        // Deterministic positions avoid a different composition on every visit.
        let seed = 37;
        function random() {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        }
        const stars = Array.from({ length: 35 }, () => ({
            x: 0.07 + random() * 0.86,
            y: 0.08 + random() * 0.84,
            size: 0.4 + random() * 0.8,
            alpha: 0.12 + random() * 0.3,
        }));

        function project(point, rotation, tilt, lean) {
            const sinRotation = Math.sin(rotation);
            const cosRotation = Math.cos(rotation);
            const sinTilt = Math.sin(tilt);
            const cosTilt = Math.cos(tilt);
            const sinLean = Math.sin(lean);
            const cosLean = Math.cos(lean);
            const rotatedX = point[0] * cosRotation + point[2] * sinRotation;
            const rotatedZ = point[2] * cosRotation - point[0] * sinRotation;
            const rotatedY = point[1] * cosTilt - rotatedZ * sinTilt;
            const depth = point[1] * sinTilt + rotatedZ * cosTilt;
            const perspective = 4.8 / (4.8 - depth);
            return [
                width * 0.5 + (rotatedX * cosLean - rotatedY * sinLean) * radius * perspective,
                height * 0.49 + (rotatedX * sinLean + rotatedY * cosLean) * radius * perspective,
                depth,
            ];
        }

        function strokePaths(paths, front, color, opacity, lineWidth) {
            context.beginPath();
            for (const points of paths) {
                for (let index = 1; index < points.length; index += 1) {
                    const from = points[index - 1];
                    const to = points[index];
                    if ((from[2] + to[2] >= 0) !== front) continue;
                    context.moveTo(from[0], from[1]);
                    context.lineTo(to[0], to[1]);
                }
            }
            context.strokeStyle = color;
            context.globalAlpha = opacity;
            context.lineWidth = lineWidth;
            context.stroke();
            context.globalAlpha = 1;
        }

        function glow(x, y, size, color) {
            const gradient = context.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, "rgba(130, 95, 255, 0)");
            context.fillStyle = gradient;
            context.fillRect(x - size, y - size, size * 2, size * 2);
        }

        function draw() {
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            context.clearRect(0, 0, width, height);
            const violet = light ? "#7551c7" : "#ab94ff";
            const lime = light ? "#5a731b" : "#d0ed8d";
            const rotation = 0.48 + elapsed * 0.00007 + pointer.x * 0.09;
            const tilt = -0.23 + pointer.y * 0.06;
            const lean = -0.32 + pointer.x * 0.025;
            glow(width * 0.51, height * 0.5, radius * 1.62,
                light ? "rgba(131, 96, 205, 0.11)" : "rgba(121, 75, 222, 0.2)");

            context.fillStyle = light ? "#6c588a" : "#d5c9f1";
            for (const star of stars) {
                context.globalAlpha = star.alpha;
                context.beginPath();
                context.arc(star.x * width, star.y * height, star.size, 0, tau);
                context.fill();
            }
            context.globalAlpha = 1;

            const mapPoint = (point) => project(point, rotation, tilt, lean);
            const globe = [...latitudePaths, ...longitudePaths].map((path) => path.map(mapPoint));
            // The orbit planes stay steady as the globe turns inside them.
            const orbits = orbitPaths.map((path) => path.map((point) => project(point, 0.48 + pointer.x * 0.04, tilt, lean)));
            strokePaths(orbits, false, violet, light ? 0.18 : 0.22, 0.8);
            strokePaths(globe, false, violet, light ? 0.15 : 0.16, 0.55);

            const centerX = width * 0.5;
            const centerY = height * 0.49;
            const core = context.createRadialGradient(centerX - radius * 0.25, centerY - radius * 0.2,
                radius * 0.1, centerX, centerY, radius * 1.05);
            core.addColorStop(0, light ? "rgba(211, 197, 239, 0.2)" : "rgba(18, 14, 34, 0.46)");
            core.addColorStop(1, "rgba(80, 50, 130, 0)");
            context.fillStyle = core;
            context.beginPath();
            context.arc(centerX, centerY, radius * 1.05, 0, tau);
            context.fill();

            strokePaths(globe, true, violet, light ? 0.56 : 0.68, 0.75);
            strokePaths([orbits[1]], true, violet, light ? 0.38 : 0.5, 0.9);
            strokePaths([orbits[0]], true, lime, light ? 0.62 : 0.78, 1.05);

            const satellite = project(orbitPoint(0.5 + elapsed * 0.00013, 1.41, 0.1),
                0.48 + pointer.x * 0.04, tilt, lean);
            glow(satellite[0], satellite[1], 20,
                light ? "rgba(115, 137, 53, 0.18)" : "rgba(197, 235, 130, 0.27)");
            context.fillStyle = lime;
            context.beginPath();
            context.arc(satellite[0], satellite[1], satellite[2] > 0 ? 3 : 2.3, 0, tau);
            context.fill();

            // A restrained crosshair anchors the sphere without adding text.
            context.strokeStyle = violet;
            context.globalAlpha = light ? 0.32 : 0.42;
            context.lineWidth = 0.7;
            for (const [x, y] of [[width * 0.18, height * 0.23], [width * 0.81, height * 0.77]]) {
                context.beginPath();
                context.moveTo(x - 4, y);
                context.lineTo(x + 4, y);
                context.moveTo(x, y - 4);
                context.lineTo(x, y + 4);
                context.stroke();
            }
            context.globalAlpha = 1;
        }

        function canAnimate() {
            return !paused && !document.hidden && inView && width > 1 && height > 1;
        }

        function tick(time) {
            frame = 0;
            if (!canAnimate()) return;
            if (!lastFrameTime) lastFrameTime = time - frameInterval;
            const delta = time - lastFrameTime;
            if (delta >= frameInterval - 0.5) {
                elapsed += Math.min(delta, 80);
                lastFrameTime = time - (delta % frameInterval);
                pointer.x += (pointer.targetX - pointer.x) * 0.055;
                pointer.y += (pointer.targetY - pointer.y) * 0.055;
                draw();
            }
            frame = requestAnimationFrame(tick);
        }

        function updatePlayback() {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            lastFrameTime = 0;
            if (canAnimate()) frame = requestAnimationFrame(tick);
        }

        function updateMotionButton() {
            if (!motionButton) return;
            const label = paused ? "Resume animation" : "Pause animation";
            const labelElement = motionButton.querySelector("[data-motion-label]");
            if (labelElement) labelElement.textContent = label;
            else motionButton.textContent = label;
            motionButton.setAttribute("aria-label", paused ? "Resume orbital animation" : "Pause orbital animation");
            motionButton.setAttribute("aria-pressed", String(paused));
            motionButton.dataset.paused = String(paused);
        }

        function resize() {
            bounds = canvas.getBoundingClientRect();
            width = Math.max(1, bounds.width);
            height = Math.max(1, bounds.height);
            radius = Math.min(width * 0.29, height * 0.32);
            pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
            canvas.width = Math.round(width * pixelRatio);
            canvas.height = Math.round(height * pixelRatio);
            draw();
            updatePlayback();
        }

        motionButton?.addEventListener("click", () => {
            paused = !paused;
            manuallyPaused = paused;
            updateMotionButton();
            updatePlayback();
        });
        mediaListener(motionQuery, () => {
            paused = Boolean(motionQuery.matches) || manuallyPaused;
            pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
            updateMotionButton();
            draw();
            updatePlayback();
        });
        stage.addEventListener("pointerenter", () => {
            bounds = canvas.getBoundingClientRect();
        });
        stage.addEventListener("pointermove", (event) => {
            if (!pointerQuery?.matches || paused || !bounds) return;
            pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / width * 2 - 1));
            pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / height * 2 - 1));
        }, { passive: true });
        stage.addEventListener("pointerleave", () => {
            pointer.targetX = pointer.targetY = 0;
        });
        document.addEventListener("visibilitychange", updatePlayback);
        window.addEventListener("pagehide", () => {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
        });
        window.addEventListener("pageshow", updatePlayback);
        window.addEventListener("resize", resize, { passive: true });
        if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(([entry]) => {
                inView = entry.isIntersecting;
                updatePlayback();
            }, { threshold: 0 }).observe(stage);
        }
        new MutationObserver(() => {
            light = root.dataset.theme === "light";
            draw();
        }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
        updateMotionButton();
        resize();
        stage.classList.add("canvas-ready");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initOrbitalArtwork, { once: true });
    } else {
        initOrbitalArtwork();
    }
})();
