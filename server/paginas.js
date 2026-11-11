// Páginas publicadas. Una página .html nueva hay que agregarla aquí; si no, el servidor no la sirve.
const PAGINAS = ['index', 'proyectos', 'productos', 'servicios', 'nosotros', 'contacto'];

// Páginas que se anuncian a los buscadores (productos queda fuera hasta tener el catálogo real).
const EN_SITEMAP = ['index', 'servicios', 'proyectos', 'nosotros', 'contacto'];

module.exports = { PAGINAS, EN_SITEMAP };
