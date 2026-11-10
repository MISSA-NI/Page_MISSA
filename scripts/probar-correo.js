// Envía un correo de prueba a MAIL_TO para comprobar la configuración de Microsoft Graph.
// Uso: npm run probar-correo
const correo = require('../server/correo');

(async () => {
  if (!correo.configurado()) {
    console.error('Falta GRAPH_TENANT_ID, GRAPH_CLIENT_ID o GRAPH_CLIENT_SECRET en .env');
    process.exit(1);
  }
  try {
    await correo.enviarAviso({
      id: 0,
      creado: new Date().toISOString().replace('T', ' ').slice(0, 19),
      nombre: 'Prueba de configuración',
      email: correo.cfg.to,
      telefono: '',
      empresa: 'MISSA',
      servicio: 'Otro',
      mensaje: 'Si recibes este correo, el formulario de www.missa-proyectos.com está listo para enviar avisos.',
    });
    console.log(`Correo de prueba enviado desde ${correo.cfg.from} a ${correo.cfg.to}`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
