// ============================================
// MISSA - JavaScript compartido (todas las páginas)
// Encabezado dinámico, menú móvil, animaciones al hacer scroll, contadores,
// carrusel del inicio, botón flotante de contacto y "volver arriba".
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.getElementById('navbar');

    // ---- Encabezado: se compacta al bajar y muestra el avance de lectura ----
    const progreso = document.querySelector('.scroll-progress');
    const botonArriba = document.getElementById('toTop');
    let pendiente = false;

    function alDesplazar() {
        const y = window.scrollY;
        if (header) header.classList.toggle('scrolled', y > 40);
        if (progreso) {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            progreso.style.transform = 'scaleX(' + (total > 0 ? Math.min(y / total, 1) : 0) + ')';
        }
        if (botonArriba) botonArriba.classList.toggle('visible', y > 600);
        pendiente = false;
    }

    window.addEventListener('scroll', function () {
        if (!pendiente) {
            pendiente = true;
            requestAnimationFrame(alDesplazar);
        }
    }, { passive: true });
    alDesplazar();

    if (botonArriba) {
        botonArriba.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reducirMovimiento ? 'auto' : 'smooth' });
        });
    }

    // ---- Menú móvil ----
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    function cerrarMenu() {
        if (!navToggle || !navMenu) return;
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-abierto');
    }

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            const abrir = !navMenu.classList.contains('active');
            this.classList.toggle('active', abrir);
            navMenu.classList.toggle('active', abrir);
            this.setAttribute('aria-expanded', String(abrir));
            document.body.classList.toggle('menu-abierto', abrir);
        });

        navMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', cerrarMenu);
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 1024) cerrarMenu();
        });
    }

    // ---- Botón flotante de contacto ----
    const fab = document.getElementById('contactoFlotante');
    const fabToggle = fab ? fab.querySelector('.cflot-toggle') : null;

    function cerrarFab() {
        if (!fab) return;
        fab.classList.remove('open');
        if (fabToggle) fabToggle.setAttribute('aria-expanded', 'false');
    }

    if (fab && fabToggle) {
        fabToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            const abrir = !fab.classList.contains('open');
            fab.classList.toggle('open', abrir);
            fabToggle.setAttribute('aria-expanded', String(abrir));
        });
        document.addEventListener('click', function (e) {
            if (!fab.contains(e.target)) cerrarFab();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            cerrarMenu();
            cerrarFab();
        }
    });

    // ---- Aparición al hacer scroll (con escalonado entre hermanos) ----
    const AUTO_REVELAR = [
        '.section-header', '.service-card-home', '.project-card-home', '.mvv-card', '.stat-item',
        '.acceso-card', '.service-page-card', '.project-detail-card', '.value-card', '.industry-card',
        '.history-card', '.contact-info-card', '.tech-content', '.tech-visual', '.cta-final .container-modern'
    ].join(',');

    const revelables = new Set(document.querySelectorAll('.fade-in-up'));
    document.querySelectorAll(AUTO_REVELAR).forEach(function (el) {
        if (!el.closest('template')) {
            el.classList.add('reveal');
            revelables.add(el);
        }
    });

    revelables.forEach(function (el) {
        const hermanos = el.parentElement ? Array.from(el.parentElement.children).filter(function (h) {
            return revelables.has(h);
        }) : [];
        const i = hermanos.indexOf(el);
        if (i > 0) el.style.transitionDelay = Math.min(i * 90, 450) + 'ms';
    });

    if (reducirMovimiento || !('IntersectionObserver' in window)) {
        revelables.forEach(function (el) { el.classList.add('visible'); });
    } else {
        const observador = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (entrada.isIntersecting) {
                    const el = entrada.target;
                    el.classList.add('visible');
                    observador.unobserve(el);
                    // Quita el retraso escalonado para que el efecto al pasar el ratón responda al instante
                    if (el.style.transitionDelay) {
                        setTimeout(function () { el.style.transitionDelay = ''; }, 1200);
                    }
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revelables.forEach(function (el) { observador.observe(el); });
    }

    // ---- Contadores animados ----
    const numeros = document.querySelectorAll('.stat-number');

    function animarContador(el) {
        const texto = el.textContent.trim();
        const m = texto.match(/(\d+)/);
        if (!m) return;
        const objetivo = parseInt(m[1], 10);
        const antes = texto.slice(0, m.index);
        const despues = texto.slice(m.index + m[1].length);
        const duracion = 1800;
        const inicio = performance.now();

        function paso(ahora) {
            const t = Math.min((ahora - inicio) / duracion, 1);
            const suave = 1 - Math.pow(1 - t, 3);
            el.textContent = antes + Math.round(objetivo * suave) + despues;
            if (t < 1) requestAnimationFrame(paso);
        }
        requestAnimationFrame(paso);
    }

    if (numeros.length && !reducirMovimiento && 'IntersectionObserver' in window) {
        const obsNumeros = new IntersectionObserver(function (entradas) {
            entradas.forEach(function (entrada) {
                if (entrada.isIntersecting) {
                    animarContador(entrada.target);
                    obsNumeros.unobserve(entrada.target);
                }
            });
        }, { threshold: 0.5 });
        numeros.forEach(function (el) { obsNumeros.observe(el); });
    }

    // ---- Carrusel (inicio) ----
    document.querySelectorAll('[data-slider]').forEach(function (slider) {
        const slides = Array.from(slider.querySelectorAll('.hero-slide'));
        const puntos = slider.querySelector('.hero-dots');
        if (slides.length < 2) return;

        const intervalo = parseInt(slider.dataset.intervalo || '6500', 10);
        slider.style.setProperty('--intervalo', intervalo + 'ms');
        let actual = 0;
        let temporizador = null;
        let pausado = false;

        function cargar(i) {
            const img = slides[i].querySelector('img[data-src]');
            if (img) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
        }

        const botones = slides.map(function (_, i) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'hero-dot';
            b.setAttribute('aria-label', 'Ver diapositiva ' + (i + 1));
            b.addEventListener('click', function () { ir(i); reiniciar(); });
            if (puntos) puntos.appendChild(b);
            return b;
        });

        function ir(i) {
            const siguiente = (i + slides.length) % slides.length;
            cargar(siguiente);
            cargar((siguiente + 1) % slides.length);
            slides.forEach(function (s, k) {
                const activa = k === siguiente;
                s.classList.toggle('is-active', activa);
                s.setAttribute('aria-hidden', String(!activa));
                s.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = activa ? 0 : -1; });
            });
            botones.forEach(function (b, k) {
                b.classList.remove('is-active');
                b.setAttribute('aria-current', k === siguiente ? 'true' : 'false');
            });
            void botones[siguiente].offsetWidth; // reinicia la barra de progreso del punto
            botones[siguiente].classList.add('is-active');
            actual = siguiente;
        }

        function reiniciar() {
            clearInterval(temporizador);
            if (reducirMovimiento || pausado) return;
            temporizador = setInterval(function () { ir(actual + 1); }, intervalo);
        }

        function pausar(p) {
            pausado = p;
            slider.classList.toggle('is-paused', p);
            reiniciar();
        }

        const prev = slider.querySelector('.hero-prev');
        const next = slider.querySelector('.hero-next');
        if (prev) prev.addEventListener('click', function () { ir(actual - 1); reiniciar(); });
        if (next) next.addEventListener('click', function () { ir(actual + 1); reiniciar(); });

        slider.addEventListener('mouseenter', function () { pausar(true); });
        slider.addEventListener('mouseleave', function () { pausar(false); });
        slider.addEventListener('focusin', function () { pausar(true); });
        slider.addEventListener('focusout', function () { pausar(false); });
        document.addEventListener('visibilitychange', function () { pausar(document.hidden); });

        // Deslizar con el dedo
        let x0 = null;
        slider.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
        slider.addEventListener('touchend', function (e) {
            if (x0 === null) return;
            const dx = e.changedTouches[0].clientX - x0;
            if (Math.abs(dx) > 50) { ir(actual + (dx < 0 ? 1 : -1)); reiniciar(); }
            x0 = null;
        }, { passive: true });

        if (reducirMovimiento) slider.classList.add('is-paused');
        ir(0);
        reiniciar();
    });

    // ---- Desplazamiento suave a anclas internas ----
    document.querySelectorAll('a[href^="#"]').forEach(function (ancla) {
        ancla.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const destino = document.querySelector(href);
            if (destino) {
                e.preventDefault();
                const offset = (header ? header.offsetHeight : 80) + 8;
                window.scrollTo({
                    top: destino.getBoundingClientRect().top + window.pageYOffset - offset,
                    behavior: reducirMovimiento ? 'auto' : 'smooth'
                });
            }
        });
    });
});
