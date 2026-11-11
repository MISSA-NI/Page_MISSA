// ============================================
// MISSA - Servidor de www.missa-proyectos.com
// Sirve la página pública y recibe el formulario de contacto.
// Independiente de app.missa-proyectos.com y portal.missa-proyectos.com.
// ============================================
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const datos = require('./db');
const correo = require('./correo');
const { PAGINAS, EN_SITEMAP } = require('./paginas');

const RAIZ = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 5002;  // NEXO usa 5000 y el portal 5001
const MAX_INTENTOS = 5;
const SITIO = (process.env.SITIO_URL || 'https://www.missa-proyectos.com').replace(/\/+$/, '');

// Se sirve la versión minificada (publico/, la genera «npm run build») si existe; con --fuente, los archivos originales.
// Solo se publican las páginas de server/paginas.js y la carpeta assets: server/, data/, .env, .git... quedan inaccesibles.
const PUBLICO = path.join(RAIZ, 'publico');
const WEB = !process.argv.includes('--fuente') && fs.existsSync(path.join(PUBLICO, 'index.html')) ? PUBLICO : RAIZ;

const SERVICIOS = [
  'Transmisión de Potencia Mecánica',
  'Accionamiento Eléctrico',
  'Controladores de Proceso',
  'Instrumentación de Procesos',
  'Control Estándar',
  'Manejo de Energía',
  'Otro',
];

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// ---- Cabeceras de seguridad básicas ----
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});

// ---- Archivos estáticos ----
app.use('/assets', express.static(path.join(WEB, 'assets'), { maxAge: '7d' }));

app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(WEB, 'index.html')));
for (const p of PAGINAS.filter((p) => p !== 'index')) {
  const archivo = path.join(WEB, `${p}.html`);
  app.get([`/${p}.html`, `/${p}`], (req, res) => res.sendFile(archivo));
}

// ---- Buscadores y redes sociales ----
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(WEB, 'assets', 'images', 'favicon-32.png'), { maxAge: '7d' }));
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITIO}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const urls = EN_SITEMAP.map((p) => `  <url><loc>${SITIO}/${p === 'index' ? '' : p + '.html'}</loc></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

// ---- Límite de envíos por IP (en memoria) ----
const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_VENTANA = 5;
const envios = new Map();
function limiteExcedido(ip) {
  const ahora = Date.now();
  const lista = (envios.get(ip) || []).filter((t) => ahora - t < VENTANA_MS);
  lista.push(ahora);
  envios.set(ip, lista);
  return lista.length > MAX_POR_VENTANA;
}
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, lista] of envios) if (lista.every((t) => ahora - t >= VENTANA_MS)) envios.delete(ip);
}, VENTANA_MS).unref();

// ---- Validación ----
const limpiar = (v, max) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const EMAIL_RE = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i;

function validar(b) {
  const m = {
    nombre: limpiar(b.nombre, 100),
    email: limpiar(b.email, 254).toLowerCase(),
    telefono: limpiar(b.telefono, 30),
    empresa: limpiar(b.empresa, 120),
    servicio: limpiar(b.servicio, 80),
    mensaje: limpiar(b.mensaje, 5000),
  };
  const errores = {};
  if (m.nombre.length < 2) errores.nombre = 'Ingresa tu nombre.';
  if (!EMAIL_RE.test(m.email)) errores.email = 'Ingresa un correo válido.';
  if (m.telefono && !/^[0-9+()\-\s.]{6,30}$/.test(m.telefono)) errores.telefono = 'Teléfono no válido.';
  if (!SERVICIOS.includes(m.servicio)) errores.servicio = 'Selecciona un servicio.';
  if (m.mensaje.length < 10) errores.mensaje = 'Cuéntanos un poco más (mínimo 10 caracteres).';
  return { m, errores };
}

// ---- Envío de aviso (no bloquea la respuesta al visitante) ----
async function notificar(id) {
  const m = datos.obtener(id);
  if (!m || m.estado_correo === 'enviado') return;
  try {
    await correo.enviarAviso(m);
    datos.marcarEnviado(id);
  } catch (e) {
    datos.marcarError(id, e.sinConfigurar ? 'sin_configurar' : 'error', e.message);
    if (!e.sinConfigurar) console.error(`[correo] mensaje #${id}: ${e.message}`);
  }
}

// Reintenta cada 10 min los avisos que no salieron (corte de internet, credenciales vencidas...)
async function reintentar() {
  if (!correo.configurado()) return;
  for (const m of datos.pendientes(MAX_INTENTOS)) await notificar(m.id);
}
setInterval(reintentar, 10 * 60 * 1000).unref();

// ---- API del formulario ----
app.post('/api/contacto', express.json({ limit: '20kb' }), async (req, res) => {
  const b = req.body || {};

  // Trampa para bots: campo oculto que una persona nunca llena, o envío demasiado rápido.
  const segundos = (Date.now() - Number(b._t || 0)) / 1000;
  if (b.sitio_web || !(segundos >= 3)) return res.json({ ok: true });

  if (limiteExcedido(req.ip)) {
    return res.status(429).json({ ok: false, error: 'Has enviado varios mensajes seguidos. Intenta de nuevo en unos minutos.' });
  }

  const { m, errores } = validar(b);
  if (Object.keys(errores).length) return res.status(400).json({ ok: false, error: 'Revisa los campos marcados.', campos: errores });

  try {
    const id = datos.guardar({
      ...m,
      telefono: m.telefono || null,
      empresa: m.empresa || null,
      ip: req.ip,
      user_agent: limpiar(req.get('user-agent'), 300),
    });
    res.json({ ok: true, id });
    notificar(id);
  } catch (e) {
    console.error('[contacto] error al guardar:', e);
    res.status(500).json({ ok: false, error: 'No pudimos registrar tu mensaje. Escríbenos a ventas@missa-ni.com.' });
  }
});

app.get('/api/salud', (req, res) => res.json({ ok: true, correo: correo.configurado() ? 'graph' : 'sin_configurar' }));

// ---- 404 ----
app.use((req, res) => {
  res.status(404).type('html').send(
    '<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Página no encontrada - MISSA</title><body style="font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:15vh 1rem;color:#1f2937">' +
    '<h1 style="color:#002E6E">Página no encontrada</h1><p>La dirección que buscas no existe.</p>' +
    '<p><a href="/" style="color:#DD1E22;font-weight:600">Volver al inicio</a></p></body></html>'
  );
});

app.listen(PORT, () => {
  console.log(`MISSA web escuchando en http://localhost:${PORT}  (${WEB === PUBLICO ? 'versión minificada: publico/' : 'archivos originales'})`);
  if (!correo.configurado()) {
    console.warn('AVISO: Microsoft Graph no está configurado. Los mensajes se guardan en la base de datos pero no se envían a', correo.cfg.to);
  }
  reintentar();
});
