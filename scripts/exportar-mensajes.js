// Exporta todos los mensajes del formulario a un CSV que abre directo en Excel.
// Uso: npm run mensajes
const fs = require('node:fs');
const path = require('node:path');
const datos = require('../server/db');

const filas = datos.todos();
const cols = ['id', 'creado', 'nombre', 'email', 'telefono', 'empresa', 'servicio', 'mensaje', 'estado_correo', 'intentos', 'ultimo_error', 'enviado_en'];
const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = '﻿' + [cols.join(';'), ...filas.map((f) => cols.map((c) => celda(f[c])).join(';'))].join('\r\n');

const dir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const salida = path.join(dir, `mensajes-${new Date().toISOString().slice(0, 10)}.csv`);
fs.writeFileSync(salida, csv);
console.log(`${filas.length} mensajes exportados a ${salida}`);
const sinEnviar = filas.filter((f) => f.estado_correo !== 'enviado').length;
if (sinEnviar) console.log(`Atención: ${sinEnviar} mensaje(s) sin aviso por correo enviado.`);
