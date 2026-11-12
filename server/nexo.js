// ============================================
// Envío de cada consulta a NEXO (app.missa-proyectos.com → «Consultas de la web»)
// Va directo al NEXO del mismo servidor (127.0.0.1), no por internet. NEXO no la duplica si llega dos veces.
// ============================================
const cfg = {
  url: (process.env.NEXO_URL || 'http://127.0.0.1:5000').replace(/\/+$/, ''),
  clave: process.env.NEXO_CLAVE || '',
};

const configurado = () => Boolean(cfg.clave);

async function enviar(m) {
  const res = await fetch(`${cfg.url}/api/consultas-web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Clave-Web': cfg.clave },
    body: JSON.stringify({
      id: m.id,
      creado: m.creado,
      nombre: m.nombre,
      email: m.email,
      telefono: m.telefono,
      empresa: m.empresa,
      servicio: m.servicio,
      mensaje: m.mensaje,
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => {
    throw new Error(`NEXO no responde en ${cfg.url} (${e.cause?.code || e.name || e.message})`);
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(`NEXO respondió ${res.status}: ${data.error || ''}`.trim());
  return data;
}

module.exports = { enviar, configurado, cfg };
