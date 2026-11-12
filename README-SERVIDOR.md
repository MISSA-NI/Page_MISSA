# www.missa-proyectos.com — Guía del servidor

La página pública ahora corre con un servidor Node.js pequeño e **independiente** de
`app.missa-proyectos.com` y `portal.missa-proyectos.com`. Hace dos cosas:

1. Publica las páginas (`*.html`) y la carpeta `assets/`. **Nada más** de la carpeta es accesible desde internet
   (`.git`, `.env`, `server/`, `data/` devuelven 404). Si existe la carpeta `publico/` (la genera `npm run build`),
   sirve esa versión: HTML y CSS minificados, sin comentarios, y JavaScript ofuscado. También responde
   `robots.txt`, `sitemap.xml` y `favicon.ico` para los buscadores.
2. Recibe el formulario de contacto (`POST /api/contacto`):
   - guarda cada mensaje en una base de datos propia: `data/mensajes.db` (SQLite);
   - envía un aviso a **ventas@missa-ni.com** por Microsoft Graph, con "Responder" dirigido al cliente;
   - si el correo falla (sin internet, credencial vencida…), el mensaje queda guardado y se reintenta cada 10 minutos.

Protección anti-spam incluida: campo trampa, tiempo mínimo de llenado y máximo 5 envíos por IP cada 15 minutos.

---

## 1. Instalación (una sola vez)

Requisito: **Node.js 22 LTS (22.13 o superior)** — https://nodejs.org

```bash
git clone https://github.com/MISSA-NI/Page_MISSA.git
cd Page_MISSA
npm ci                      # instala también las herramientas de minificado (no usar --omit=dev)
npm run build               # genera publico/ (versión minificada y ofuscada que se publica)
cp .env.example .env        # en Windows: copy .env.example .env
# editar .env con los datos de Microsoft Graph (sección 3)
npm start
```

Al arrancar, la consola indica qué versión sirve: `versión minificada: publico/` o `archivos originales`.
Para trabajar en los archivos originales sin construir: `npm run dev`.

Abrir http://localhost:5002 para comprobar. `http://localhost:5002/api/salud` debe responder
`"correo":"graph"` cuando el envío de correo esté configurado.

## 2. Dejarlo como servicio y publicarlo con HTTPS

El proceso Node escucha en el puerto 5002 (local; NEXO usa 5000 y el portal 5001). Delante va el servidor web, que pone el certificado
HTTPS y reenvía a Node. Dejar `TRUST_PROXY=1` en `.env`.

**Windows Server**
- Servicio: [NSSM](https://nssm.cc) → `nssm install MISSA-Web "C:\Program Files\nodejs\npm.cmd" start`
  con directorio de inicio = carpeta del repositorio.
- HTTPS: IIS con *URL Rewrite* + *Application Request Routing* como proxy inverso a `http://localhost:5002`,
  certificado con win-acme (Let's Encrypt).

**Linux**
- Servicio: systemd (`ExecStart=/usr/bin/npm start`, `WorkingDirectory=/ruta/Page_MISSA`, `Restart=always`).
- HTTPS: Nginx o Caddy con `proxy_pass http://127.0.0.1:5002`.

DNS: `www.missa-proyectos.com` y `missa-proyectos.com` apuntando al servidor; redirigir el dominio sin `www` a `www`.

## 3. Correo: Microsoft Graph (una sola vez)

No se usa la contraseña del buzón ni SMTP: Microsoft desactiva por defecto el SMTP con usuario/contraseña
a finales de diciembre 2026. Graph usa OAuth y no tiene esa fecha de corte.

Lo hace un administrador de Microsoft 365:

1. **Entra ID → Registros de aplicaciones → Nuevo registro**: nombre `MISSA Web Formulario`, una sola organización.
   Anotar *Id. de aplicación (cliente)* e *Id. de directorio (inquilino)* → `GRAPH_CLIENT_ID` y `GRAPH_TENANT_ID`.
2. **Certificados y secretos → Nuevo secreto de cliente** → copiar el *valor* → `GRAPH_CLIENT_SECRET`.
   ⚠️ Anotar la fecha de vencimiento (máx. 24 meses) y renovarlo antes; si vence, los mensajes se siguen
   guardando pero no llegan avisos.
3. **No** agregar el permiso `Mail.Send` en Entra ID (daría permiso para enviar como *cualquier* buzón).
   En su lugar, limitarlo solo a ventas@ desde Exchange Online PowerShell:

```powershell
Connect-ExchangeOnline

# AppId = Id. de aplicación (cliente); ObjectId = Id. de objeto de la *Aplicación empresarial* (no del registro)
New-ServicePrincipal -AppId <APP_ID> -ObjectId <OBJECT_ID_APLICACION_EMPRESARIAL> -DisplayName "MISSA Web Formulario"

New-ManagementScope -Name "Solo buzon ventas" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'ventas@missa-ni.com'"

New-ManagementRoleAssignment -App <APP_ID> -Role "Application Mail.Send" -CustomResourceScope "Solo buzon ventas"
```

   El cambio puede tardar hasta 2 horas en aplicarse.
4. Completar `.env`, reiniciar el servicio y probar: `npm run probar-correo` (llega un correo de prueba a ventas@).

## 3b. Bandeja de consultas en NEXO (una sola vez)

Cada consulta del formulario, además de guardarse aquí y avisar a ventas@, se envía al NEXO **del mismo servidor**
(`http://127.0.0.1:5000`, no pasa por internet) y aparece en NEXO → *Proyectos y clientes → Consultas de la web*,
donde se atiende y se convierte en oportunidad.

1. Generar una clave: `python -c "import secrets; print(secrets.token_urlsafe(32))"` (o cualquier texto largo y aleatorio).
2. Ponerla en el `.env` de esta página como `NEXO_CLAVE=` y en `NEXO\conexion.env` como `WEB_CONSULTAS_CLAVE=` (la misma).
3. Reiniciar NEXO y esta página. `/api/salud` debe mostrar `"nexo": "configurado"`.

Si NEXO está apagado o reiniciándose, la consulta queda guardada aquí y se reenvía cada 10 minutos (hasta dos días).
La primera vez que se configura la clave también se envían las consultas anteriores. NEXO no duplica una consulta
aunque llegue dos veces. Si NEXO corre en otro equipo o puerto, cambiar `NEXO_URL`.

## 4. Actualizar después de cada `git pull`

```bash
git pull
npm ci          # solo hace falta si cambió package.json / package-lock.json
npm run build   # SIEMPRE: si no, se sigue publicando la versión anterior que quedó en publico/
# reiniciar el servicio (nssm restart MISSA-Web  |  sudo systemctl restart missa-web)
```

Los archivos `.env`, `data/` y `publico/` no están en git: el pull nunca los toca.

## 5. Consultar los mensajes

```bash
npm run mensajes
```

Genera `data/mensajes-AAAA-MM-DD.csv` (abre directo en Excel) e indica si hay mensajes cuyo aviso no salió.

**Respaldo:** copiar periódicamente la carpeta `data/`.
