// ============================================
// Envío de avisos por Microsoft Graph (OAuth, sin contraseña de buzón)
// ============================================
const cfg = {
  tenant: process.env.GRAPH_TENANT_ID,
  clientId: process.env.GRAPH_CLIENT_ID,
  secret: process.env.GRAPH_CLIENT_SECRET,
  from: process.env.MAIL_FROM || 'ventas@missa-ni.com',
  to: process.env.MAIL_TO || 'ventas@missa-ni.com',
};

const configurado = () => Boolean(cfg.tenant && cfg.clientId && cfg.secret);

let token = null;
let tokenExpira = 0;

async function obtenerToken() {
  if (token && Date.now() < tokenExpira - 60_000) return token;
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Token Microsoft: ${res.status} ${data.error || ''} ${data.error_description || ''}`.trim());
  token = data.access_token;
  tokenExpira = Date.now() + (data.expires_in || 3600) * 1000;
  return token;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cuerpoHtml(m) {
  const fila = (k, v) => v ? `<tr><td style="padding:6px 12px;color:#6b7280;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 12px;color:#111827">${v}</td></tr>` : '';
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px">
    <div style="background:#002E6E;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
      <strong style="font-size:16px">Nuevo mensaje desde www.missa-proyectos.com</strong>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px;padding:12px 8px">
      <table style="border-collapse:collapse;font-size:14px">
        ${fila('N.º', '#' + m.id)}
        ${fila('Fecha', esc(m.creado) + ' (UTC)')}
        ${fila('Nombre', esc(m.nombre))}
        ${fila('Correo', `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>`)}
        ${fila('Teléfono', esc(m.telefono))}
        ${fila('Empresa', esc(m.empresa))}
        ${fila('Servicio', esc(m.servicio))}
      </table>
      <div style="margin:12px;padding:12px 14px;background:#f3f4f6;border-left:4px solid #DD1E22;white-space:pre-wrap;font-size:14px;color:#111827">${esc(m.mensaje)}</div>
      <p style="margin:12px;font-size:12px;color:#9ca3af">Responder a este correo contesta directamente al cliente.</p>
    </div>
  </div>`;
}

async function enviarAviso(m) {
  if (!configurado()) {
    const e = new Error('Microsoft Graph no configurado (.env)');
    e.sinConfigurar = true;
    throw e;
  }
  const t = await obtenerToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.from)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: `Contacto web #${m.id}: ${m.servicio} — ${m.nombre}${m.empresa ? ' (' + m.empresa + ')' : ''}`,
        body: { contentType: 'HTML', content: cuerpoHtml(m) },
        toRecipients: [{ emailAddress: { address: cfg.to } }],
        replyTo: [{ emailAddress: { address: m.email, name: m.nombre } }],
      },
      saveToSentItems: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status !== 202) {
    const txt = await res.text().catch(() => '');
    if (res.status === 401) token = null;
    throw new Error(`Graph sendMail: ${res.status} ${txt.slice(0, 300)}`);
  }
}

module.exports = { enviarAviso, configurado, cfg };
