// ============================================
// MISSA - Proyectos - Versión simple y robusta
// ============================================

var ZOOM_MIN = 1;
var ZOOM_MAX = 5;
var ZOOM_STEP = 0.25;

var lb = {
    isOpen: false,
    index: 0,
    images: [],
    scale: 1,
    x: 0,
    y: 0,
    drag: false,
    sx: 0,
    sy: 0
};

var projectGalleries = {
    "proyecto1": [
        {src: "assets/images/amoniaco.png", desc: "Sistema de control para compresores"},
        {src: "assets/images/amoniaco2.png", desc: "Instalación eléctrica"},
        {src: "assets/images/amoniaco3.png", desc: "Panel de control"}
    ],
    "proyecto2": [
        {src: "assets/images/tiptop1.webp", desc: "Sistema de control de bombeo"},
        {src: "assets/images/tiptop2.webp", desc: "Panel de control"}
    ],
    "proyecto3": [
        {src: "assets/images/mina_p1.png", desc: "Sistema de automatización minera"},
        {src: "assets/images/mina_p2.png", desc: "Equipos instalados"}
    ],
    "proyecto4": [
        {src: "assets/images/mani1.webp", desc: "Prelimpia de maní"},
        {src: "assets/images/mani2.webp", desc: "Sistema eléctrico"}
    ],
    "proyecto5": [
        {src: "assets/images/enacal_scada1.png", desc: "Sistema SCADA para pozos"},
        {src: "assets/images/enacal_scada2.png", desc: "Planta de tratamiento"},
        {src: "assets/images/enacal_scada3.png", desc: "Planta de tratamiento"},
        {src: "assets/images/enacal_scada4.png", desc: "Planta de tratamiento"}
    ],
    "proyecto6": [
        {src: "assets/images/cruka1.png", desc: "Diseño eléctrico prelimpia"},
        {src: "assets/images/cruka2.png", desc: "Planta de tratamiento"},
        {src: "assets/images/cruka3.png", desc: "Planta de tratamiento"},
        {src: "assets/images/cruka4.png", desc: "Planta de tratamiento"}
    ]
};

// ============================================
// ABRIR GALERÍA
// ============================================
function openGallery(projectId) {
    console.log('openGallery:', projectId);
    
    var gallery = projectGalleries[projectId] || [];
    var modal = document.getElementById('galleryModal');
    var content = document.getElementById('galleryContent');
    var title = document.getElementById('galleryModalLabel');
    var counter = document.getElementById('galleryCounter');

    if (!modal || !content) {
        alert('ERROR: No se encontró el modal en el HTML');
        return;
    }

    // Título
    var btn = document.querySelector('[onclick*="' + projectId + '"]');
    var card = btn ? btn.closest('.project-detail-card') : null;
    var projectTitle = card ? card.querySelector('h3').textContent : 'Galería';
    if (title) title.textContent = projectTitle;
    if (counter) counter.textContent = gallery.length + (gallery.length === 1 ? ' foto' : ' fotos');

    // Guardar imágenes
    lb.images = gallery;

    // Contenido
    if (gallery.length === 0) {
        content.innerHTML = '<div class="gallery-empty"><i class="fas fa-image"></i><p>No hay fotos</p></div>';
    } else {
        var html = '';
        for (var i = 0; i < gallery.length; i++) {
            html += '<button type="button" class="gallery-item" data-gallery-index="' + i + '">' +
                '<img src="' + gallery[i].src + '" alt="' + (gallery[i].desc || '') + '" loading="lazy">' +
                '<span class="gallery-item-zoom-hint"><i class="fas fa-search-plus"></i></span>' +
                '</button>';
        }
        content.innerHTML = html;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

// ============================================
// CERRAR GALERÍA
// ============================================
function closeGallery() {
    var modal = document.getElementById('galleryModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
    if (lb.isOpen) closeLightbox();
    document.body.style.overflow = '';
}

// ============================================
// ABRIR LIGHTBOX
// ============================================
function openLightbox(index) {
    console.log('openLightbox:', index);
    
    if (!lb.images[index]) return;

    lb.isOpen = true;
    lb.index = index;
    lb.scale = 1;
    lb.x = 0;
    lb.y = 0;

    var lightbox = document.getElementById('imageLightbox');
    var img = document.getElementById('lightboxImg');
    var caption = document.getElementById('lightboxCaption');
    var counter = document.getElementById('lightboxCounter');

    if (!lightbox || !img) {
        alert('ERROR: No se encontró el lightbox');
        return;
    }

    var data = lb.images[index];
    img.src = data.src;
    img.alt = data.desc || '';
    img.style.transform = 'translate(0,0) scale(1)';
    
    if (caption) caption.textContent = data.desc || '';
    if (counter) counter.textContent = (index + 1) + ' / ' + lb.images.length;

    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');

    updateZoomUI();
}

// ============================================
// CERRAR LIGHTBOX
// ============================================
function closeLightbox() {
    var lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
    }
    lb.isOpen = false;
    lb.scale = 1;
    lb.x = 0;
    lb.y = 0;
}

// ============================================
// NAVEGAR
// ============================================
function navigateLightbox(dir) {
    if (!lb.isOpen) return;
    
    var newIndex = lb.index + dir;
    if (newIndex < 0) newIndex = lb.images.length - 1;
    if (newIndex >= lb.images.length) newIndex = 0;

    lb.index = newIndex;
    lb.scale = 1;
    lb.x = 0;
    lb.y = 0;

    var img = document.getElementById('lightboxImg');
    var caption = document.getElementById('lightboxCaption');
    var counter = document.getElementById('lightboxCounter');
    var data = lb.images[newIndex];

    if (img) {
        img.src = data.src;
        img.alt = data.desc || '';
        img.style.transform = 'translate(0,0) scale(1)';
    }
    if (caption) caption.textContent = data.desc || '';
    if (counter) counter.textContent = (newIndex + 1) + ' / ' + lb.images.length;

    updateZoomUI();
}

// ============================================
// ZOOM
// ============================================
function changeZoom(delta) {
    var newScale = lb.scale + delta;
    newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale));

    if (newScale <= ZOOM_MIN) {
        lb.x = 0;
        lb.y = 0;
    }

    lb.scale = newScale;
    applyZoom();
}

function resetZoom() {
    lb.scale = 1;
    lb.x = 0;
    lb.y = 0;
    applyZoom();
}

function applyZoom() {
    var img = document.getElementById('lightboxImg');
    if (!img) return;
    img.style.transform = 'translate(' + lb.x + 'px, ' + lb.y + 'px) scale(' + lb.scale + ')';
    updateZoomUI();
}

function updateZoomUI() {
    var level = document.getElementById('lightboxZoomLevel');
    var outBtn = document.querySelector('[data-lb-action="zoom-out"]');
    var inBtn = document.querySelector('[data-lb-action="zoom-in"]');

    if (level) level.textContent = Math.round(lb.scale * 100) + '%';
    if (outBtn) outBtn.disabled = lb.scale <= ZOOM_MIN;
    if (inBtn) inBtn.disabled = lb.scale >= ZOOM_MAX;
}

// ============================================
// DRAG
// ============================================
function startDrag(e) {
    if (lb.scale <= 1) return;
    if (e.target.closest('.lightbox-controls')) return;
    if (e.target.closest('.lightbox-nav')) return;

    var isTouch = e.type === 'touchstart';
    var cx = isTouch ? e.touches[0].clientX : e.clientX;
    var cy = isTouch ? e.touches[0].clientY : e.clientY;

    lb.drag = true;
    lb.sx = cx - lb.x;
    lb.sy = cy - lb.y;

    function onMove(ev) {
        if (!lb.drag) return;
        var mx = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX;
        var my = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY;
        lb.x = mx - lb.sx;
        lb.y = my - lb.sy;
        applyZoom();
    }

    function onEnd() {
        lb.drag = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    }

    if (isTouch) {
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    } else {
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    }
}

// ============================================
// TOGGLE FULLSCREEN
// ============================================
function toggleFullscreen() {
    var content = document.querySelector('.modal-modern-content');
    if (content) content.classList.toggle('fullscreen');
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ proyectos.js cargado');

    // Delegación de eventos para el MODAL
    document.addEventListener('click', function(e) {
        // Click en imagen de la galería
        var item = e.target.closest('.gallery-item');
        if (item && item.closest('#galleryContent')) {
            var idx = parseInt(item.getAttribute('data-gallery-index'), 10);
            openLightbox(idx);
            return;
        }

        // Botones del lightbox
        var btn = e.target.closest('[data-lb-action]');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            var action = btn.getAttribute('data-lb-action');
            
            if (action === 'close') closeLightbox();
            else if (action === 'zoom-in') changeZoom(ZOOM_STEP);
            else if (action === 'zoom-out') changeZoom(-ZOOM_STEP);
            else if (action === 'reset') resetZoom();
            else if (action === 'prev') navigateLightbox(-1);
            else if (action === 'next') navigateLightbox(1);
            return;
        }

        // Cerrar con backdrop del lightbox
        if (e.target.classList.contains('lightbox-backdrop')) {
            closeLightbox();
            return;
        }

        // Cerrar con overlay del modal
        if (e.target.classList.contains('modal-modern-overlay')) {
            closeGallery();
            return;
        }

        // Cerrar con botón del modal
        if (e.target.closest('.modal-modern-close')) {
            closeGallery();
            return;
        }
    });

    // Rueda del mouse en el lightbox
    var stage = document.querySelector('.lightbox-stage');
    if (stage) {
        stage.addEventListener('wheel', function(e) {
            e.preventDefault();
            changeZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
        }, { passive: false });
    }

    // Drag en la imagen
    var img = document.getElementById('lightboxImg');
    if (img) {
        img.addEventListener('mousedown', startDrag);
        img.addEventListener('touchstart', startDrag, { passive: true });
        img.addEventListener('dblclick', function() {
            if (lb.scale > 1) resetZoom();
            else changeZoom(ZOOM_STEP * 4);
        });
    }

    // Teclado
    document.addEventListener('keydown', function(e) {
        if (lb.isOpen) {
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') navigateLightbox(-1);
            else if (e.key === 'ArrowRight') navigateLightbox(1);
            else if (e.key === '+' || e.key === '=') changeZoom(ZOOM_STEP);
            else if (e.key === '-') changeZoom(-ZOOM_STEP);
            else if (e.key === '0') resetZoom();
        }
    });
});

// Exponer globalmente
window.openGallery = openGallery;
window.closeGallery = closeGallery;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;