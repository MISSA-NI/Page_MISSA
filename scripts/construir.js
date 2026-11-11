const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const Ofuscador = require('javascript-obfuscator');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'publico');
const { PAGINAS } = require('../server/paginas');

const OPCIONES_JS = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: false,
  selfDefending: false,
  simplify: true,
  unicodeEscapeSequence: false,
};

const OPCIONES_HTML = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
};

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
let antes = 0;
let despues = 0;

function escribir(relativa, contenido, original) {
  const destino = path.join(DESTINO, relativa);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido);
  antes += Buffer.byteLength(original);
  despues += Buffer.byteLength(contenido);
}

function recorrer(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(ruta) : [ruta];
  });
}

async function construir() {
  fs.rmSync(DESTINO, { recursive: true, force: true });

  for (const archivo of recorrer(path.join(RAIZ, 'assets'))) {
    const relativa = path.relative(RAIZ, archivo);
    const ext = path.extname(archivo).toLowerCase();
    const texto = ext === '.js' || ext === '.css' ? fs.readFileSync(archivo, 'utf8') : null;

    if (ext === '.js') {
      escribir(relativa, Ofuscador.obfuscate(texto, OPCIONES_JS).getObfuscatedCode(), texto);
    } else if (ext === '.css') {
      const r = new CleanCSS({ level: 1 }).minify(texto);
      if (r.errors.length) throw new Error(`${relativa}: ${r.errors.join('; ')}`);
      escribir(relativa, r.styles, texto);
    } else {
      const destino = path.join(DESTINO, relativa);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(archivo, destino);
    }
  }

  for (const p of PAGINAS) {
    const texto = fs.readFileSync(path.join(RAIZ, `${p}.html`), 'utf8');
    escribir(`${p}.html`, await minify(texto, OPCIONES_HTML), texto);
  }

  console.log(`Sitio construido en publico/  (HTML, CSS y JS: ${kb(antes)} -> ${kb(despues)})`);
}

construir().catch((e) => {
  console.error('Error al construir:', e.message);
  process.exit(1);
});
