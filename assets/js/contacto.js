function loadMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        mapContainer.innerHTML = `
            <a href="https://www.google.com/maps/place/MISSA+INDUSTRIAL+SUPPLY+DE+NICARAGUA+S.A/@12.1216061,-86.3088286,17z" 
               target="_blank" 
               rel="noopener"
               class="map-mobile-link">
                <img src="assets/images/map_m.webp" alt="Ubicación MISSA" loading="lazy">
                <span class="map-mobile-btn">
                    <i class="fas fa-map-marked-alt"></i>
                    Abrir en Google Maps
                </span>
            </a>
        `;
    } else {
        mapContainer.innerHTML = `
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d281.6794528674488!2d-86.3088285524297!3d12.121606099385488!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f71550017618bbb%3A0x28defdc6255a2ecc!2sMISSA%20INDUSTRIAL%20SUPPLY%20DE%20NICARAGUA%20S.A!5e0!3m2!1ses!2sni!4v1751661013218!5m2!1ses!2sni" 
                    style="border:0;" 
                    allowfullscreen="" 
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        `;
    }
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(loadMap, 300);
});

loadMap();

const form = document.getElementById('contactForm');
if (form) {
    const campoT = document.getElementById('form_t');
    if (campoT) campoT.value = Date.now();

    const mensaje = document.getElementById('mensaje');
    const contador = document.getElementById('mensaje-contador');
    const actualizarContador = () => {
        if (!mensaje || !contador) return;
        const max = Number(mensaje.getAttribute('maxlength')) || 500;
        const n = mensaje.value.length;
        contador.querySelector('span').textContent = n;
        contador.classList.toggle('cerca', n >= max * 0.9 && n < max);
        contador.classList.toggle('limite', n >= max);
    };
    if (mensaje) mensaje.addEventListener('input', actualizarContador);
    actualizarContador();

    const mostrarAviso = (tipo, titulo, texto) => {
        form.parentNode.querySelectorAll('.form-success-message, .form-error-message').forEach(el => el.remove());
        const aviso = document.createElement('div');
        aviso.className = tipo === 'ok' ? 'form-success-message' : 'form-error-message';
        aviso.setAttribute('role', tipo === 'ok' ? 'status' : 'alert');
        aviso.innerHTML = `<i class="fas ${tipo === 'ok' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><div><strong></strong><p></p></div>`;
        aviso.querySelector('strong').textContent = titulo;
        aviso.querySelector('p').textContent = texto;
        form.parentNode.insertBefore(aviso, form);
        aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (tipo === 'ok') {
            setTimeout(() => {
                aviso.style.opacity = '0';
                setTimeout(() => aviso.remove(), 300);
            }, 8000);
        }
    };

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            const firstInvalid = form.querySelector(':invalid');
            if (firstInvalid) {
                firstInvalid.focus();
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        try {
            const res = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok) {
                mostrarAviso('ok', '¡Mensaje enviado!', 'Gracias por escribirnos. Nuestro equipo te contactará en menos de 24 horas.');
                form.reset();
                actualizarContador();
                form.classList.remove('was-validated');
                if (campoT) campoT.value = Date.now();
            } else {
                if (data.campos) {
                    Object.keys(data.campos).forEach(n => {
                        const campo = form.elements[n];
                        if (campo) campo.classList.add('is-invalid');
                    });
                }
                mostrarAviso('error', 'No se pudo enviar', data.error || 'Intenta de nuevo o escríbenos a ventas@missa-ni.com.');
            }
        } catch (err) {
            mostrarAviso('error', 'Sin conexión', 'No pudimos enviar tu mensaje. Revisa tu conexión o escríbenos a ventas@missa-ni.com.');
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    });

    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('blur', function() {
            if (this.value && !this.checkValidity()) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });

        field.addEventListener('input', function() {
            if (this.classList.contains('is-invalid') && this.checkValidity()) {
                this.classList.remove('is-invalid');
            }
        });
    });
}
