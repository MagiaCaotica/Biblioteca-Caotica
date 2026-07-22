# 📖 BIBLIA DEL PROYECTO — Biblioteca Caótica Arcana

> Documentación técnica completa. Lee esto antes de tocar cualquier archivo.

---

## 🏗 ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Pages                        │
│         magiacaotica.github.io/Biblioteca-Caotica    │
├─────────────────────────────────────────────────────┤
│  index.html     ← Entrada única (SPA)               │
│  style.css      ← Tema oscuro + WCAG AA              │
│  script.js      ← Lógica: scroll, filtros, modal     │
│  biblioteca_datos.js ← 1,567 libros (594 KB)        │
│  leer.html      ← Visor PDF.js standalone            │
│  sw.js          ← Service Worker (cache)             │
│  manifest.json  ← PWA                                │
│  robots.txt     ← SEO                                │
│  sitemap.xml    ← SEO                                │
│  404.html       ← Error page                         │
├─────────────────────────────────────────────────────┤
│              FUENTES EXTERNAS                        │
│  Mega.nz        ← Hosting de PDFs (20+ GB)          │
│  AdFoc.us       ← Monetización (links de descarga)   │
│  Google Fonts   ← Cinzel + Lora                     │
│  FlagCDN        ← Banderas de idiomas               │
│  PDF.js (CDN)   ← Visor en leer.html                │
└─────────────────────────────────────────────────────┘
```

---

## 📁 DESCRIPCIÓN DE CADA ARCHIVO

### `index.html` — Página principal (SPA)

**Rol**: Única página de la aplicación. Todo el contenido se renderiza con JS.

**Estructura**:
```
<head>
  ├── Meta tags SEO (title, description, keywords, robots, canonical)
  ├── Open Graph (Facebook, LinkedIn, WhatsApp)
  ├── Twitter Cards
  ├── Schema.org JSON-LD (WebSite + CollectionPage + BreadcrumbList)
  ├── PWA meta tags (manifest, apple-mobile-web-app)
  └── Google Fonts (Cinzel + Lora)
<body>
  ├── Skip link (accesibilidad WCAG 2.4.1)
  ├── Header
  │   ├── Banderas de idiomas (Google Translate)
  │   ├── Contador de visitas (localStorage)
  │   ├── Título + logos animados
  │   ├── Snippet GEO oculto (para LLMs)
  │   └── Enlaces comunidad (Blog, YouTube, Telegram)
  ├── Main
  │   ├── Controles (buscador + filtros categoría/idioma)
  │   ├── Contador de resultados (#total-libros)
  │   ├── Estantería (grid de libros)
  │   └── Sentinel de scroll infinito
  ├── Footer
  │   ├── Cita de Nietzsche
  │   ├── Info legal + descargo
  │   └── Enlaces footer
  ├── Modal de previsualización (window.open a Mega)
  ├── Scripts
  │   ├── biblioteca_datos.js (defer)
  │   ├── script.js (defer)
  │   └── Service Worker registration
  └── </body>
```

**Dependencias**: `style.css`, `script.js`, `biblioteca_datos.js`

---

### `style.css` — Estilos

**Rol**: Tema oscuro completo con diseño responsive y accesibilidad WCAG 2.2 AA.

**Sistema de diseño**:
- **Custom Properties** (variables CSS) en `:root`
- **Paleta**: Negro (#121212), Gris oscuro (#1e1e1e), Dorado (#d4af37), Blanco hueso (#e0e0e0)
- **Tipografía**: Cinzel (títulos) + Lora (cuerpo)
- **Grid**: `repeat(auto-fill, minmax(320px, 1fr))`

**Secciones del CSS** (en orden):
| Bloque | Línea aprox | Descripción |
|--------|------------|-------------|
| Design Tokens | 1-30 | Variables CSS (:root) |
| Reset | 31-55 | Box-sizing, scroll-behavior |
| Skip Link | 57-72 | Accesibilidad |
| Focus Visible | 74-88 | WCAG 2.4.7 |
| Header | 90-155 | Banner, meta, banderas, título |
| Main | 157-170 | Contenedor principal |
| Controls | 172-210 | Buscador, selects |
| Bookshelf Grid | 212-225 | Grid de libros |
| Book Card | 227-280 | Tarjeta individual |
| Book Cover | 282-390 | Portada generativa (gradient + icono + título) |
| Book Actions | 392-445 | Botones descargar/previsualizar/compartir |
| Modal | 447-530 | Overlay, container, header, body, footer |
| Loading/Empty | 532-555 | Spinner, placeholder |
| Footer | 557-610 | Cita, links, disclaimer |
| Responsive Tablet | 612-640 | ≤768px |
| Responsive Mobile | 642-670 | ≤480px |
| Reduced Motion | 672-690 | prefers-reduced-motion |
| Forced Colors | 692-705 | High contrast mode |
| Print | 707-730 | @media print |

---

### `script.js` — Lógica de la aplicación

**Rol**: Motor principal. Carga datos, renderiza libros, maneja filtros, scroll infinito, modal de previsualización.

**Flujo de inicio**:
```
DOMContentLoaded
  ├── Carga BIBLIOTECA_DATOS
  ├── Normaliza campos (titulo→título, autor→autor, etc.)
  ├── popularIdiomas() → llena <select> de idiomas
  ├── popularCategorias() → llena <select> de categorías
  ├── iniciarVista() → primer render
  ├── configurarIntersectionObserver() → scroll infinito
  └── actualizarMetaDescription() → SEO dinámico
```

**Funciones clave**:

| Función | Descripción |
|---------|-------------|
| `mostrarLibros()` | Renderiza 12 libros por lote. Usa `DocumentFragment` para rendimiento |
| `generarColorPortada(titulo)` | Hash del título → color HSL único para cada portada |
| `obtenerIcono(categoria)` | Mapa 38 categorías → emoji/unicode representativo |
| `parsearMegaUrl(url)` | Extrae fileId + key de URL Mega → genera `mega.nz/embed#!ID!KEY` |
| `crearLinkAdfocus(url)` | Envuelve URL con monetización AdFoc.us |
| `abrirModal(titulo, embedUrl, link)` | Abre previsualización en pestaña nueva (`window.open`) |
| `cerrarModal()` | Cierra modal, restaura scroll |
| `filtrarLibros()` | Filtra por texto + categoría + idioma |
| `filtrarLibrosDebounced()` | Debounce 250ms para el buscador |
| `escapeHTML(str)` | Sanitiza HTML |
| `escapeAttr(str)` | Sanitiza atributos HTML |
| `sanitizeId(str)` | Genera ID seguro para DOM |

**Scroll infinito**:
- `IntersectionObserver` con `rootMargin: 400px` (precarga antes de llegar al final)
- Fallback: evento `scroll` con `requestAnimationFrame`
- Carga lotes de 12 libros (`LIBROS_POR_PAGINA`)

**Atajos de teclado**:
- `Ctrl+K` o `/` → enfoca el buscador
- `Escape` → cierra el modal

**Contador de visitas**:
- `localStorage` → persiste entre sesiones
- `sessionStorage` → incrementa solo 1 vez por sesión
- Formato: número con separadores de miles (`.toLocaleString('es')`)

---

### `biblioteca_datos.js` — Base de datos

**Rol**: Catálogo completo de libros. Un array de 1,567 objetos.

**Formato de cada entrada**:
```javascript
{
    "autor":    "Christopher Penczak",
    "titulo":   "City Magick: Spells, Rituals, and Symbols for the Urban Witch",
    "resumen":  "City Magick challenges the belief that magic only resides in nature...",
    "categoria": "Tecnomagia y Ocultismo Contemporáneo",
    "idioma":   "Inglés",
    "link":     "https://mega.nz/file/uN0BmLqJ#HJGs1HSanT8H5jWEixh3vTrphcx7PZ48J2xmGc3NCvQ"
}
```

**Taxonomía (20 categorías)**:
```
Ocultismo General · Cábala y Misticismo · Satanismo y Senda de la Mano Izquierda
Magia del Caos · Grimorios y Magia Ceremonial · Adivinación y Artes Adivinatorias
Ocultismo Oriental · Brujería, Wicca y Paganismo · Hermetismo y Alquimia
Misterios Egipcios y Oriente Medio · Runas y Tradición Nórdica
Magia Práctica y Hechicería · Historia del Ocultismo
Gnosticismo y Cristianismo Esotérico · Espiritualidad y Desarrollo Personal
Ufología y Misterios · Tecnomagia y Ocultismo Contemporáneo
Filosofía Oculta y Teoría Mágica · Literatura y Ficción Ocultista
Textos Clásicos y Referencia
```

**Sincronización con Mega**:
- Los links se actualizan ejecutando `sync_mega.js` (requiere Node.js + megajs)
- El script se conecta a la cuenta de Mega, lista archivos, genera links públicos
- Luego matchea por nombre contra las entradas existentes
- Ver `#sincronizacion` abajo para el procedimiento completo

---

### `leer.html` — Visor PDF standalone

**Rol**: Visor de PDFs con PDF.js 4.7. Solo funciona con URLs directas (NO Mega).

**Uso**:
```
leer.html?url=https://ejemplo.com/documento.pdf&titulo=Mi Documento
```

**Controles**:
- ◀ Anterior / Siguiente ▶
- Input numérico para saltar a página
- Zoom con `Ctrl + Scroll`
- Teclado: `←` `→` `Home` `End`
- Botón volver a la biblioteca

---

### `sw.js` — Service Worker

**Rol**: Caché offline y estrategia de carga.

**Estrategias**:
- **Cache-first** para assets propios (index.html, style.css, script.js, biblioteca_datos.js)
- **Stale-while-revalidate** para imágenes de banderas (flagcdn.com)
- **Network-first** con fallback a cache para todo lo demás
- Las peticiones a AdFoc.us, Google Analytics y contadores se ignoran (no se cachean)

---

### `robots.txt` — Reglas de crawling

```
User-agent: *
Allow: /
Disallow: /leer.html
Crawl-delay: 10
Sitemap: https://magiacaotica.github.io/Biblioteca-Caotica/sitemap.xml
```

---

### `sitemap.xml` — Mapa del sitio

- URL principal con prioridad 1.0, frecuencia semanal
- URL del visor con prioridad 0.7
- Hreflang alternativo (es, en, x-default)

---

### `manifest.json` — PWA

- Nombre: "Biblioteca Ocultista Arcana Caótica"
- Short name: "Biblio Caótica"
- Tema: oscuro (#121212)
- Display: standalone
- Categorías: books, education, reference

---

## 🔄 FLUJO DE SINCRONIZACIÓN CON MEGA

Cuando necesites actualizar los links o añadir libros nuevos desde Mega:

```bash
# 1. Instalar dependencia
npm install megajs

# 2. Ejecutar script de sincronización
node sync_mega.js

# 3. El script:
#    - Se conecta a Mega (email + password en el script)
#    - Lista todos los archivos recursivamente
#    - Genera links públicos con clave de descifrado
#    - Matchea contra biblioteca_datos.js existente
#    - Añade entradas nuevas para archivos sin match
#    - Guarda checkpoint cada 100 archivos

# 4. Limpiar
rm -rf node_modules package.json package-lock.json
```

---

## ⚠️ LIMITACIONES CONOCIDAS

### Embed de Mega.nz
- **NO se puede embeber Mega en iframe**: Mega detecta `window.top !== window.self` en su JS y bloquea el renderizado
- **NO se puede usar CORS proxy**: La clave de descifrado está en el fragmento de URL (no se envía al servidor)
- **Solución actual**: `window.open()` abre el embed de Mega en pestaña nueva
- **Alternativa futura**: Migrar PDFs selectos a GitHub Releases o Internet Archive para embed real con PDF.js

### Clasificación automática
- ~71% de los libros están en "Ocultismo General" — el clasificador por keywords no es perfecto
- Libros sin autor claro en el nombre del archivo quedan como "Autor Desconocido"

---

## 🎯 OPTIMIZACIONES IMPLEMENTADAS

| Área | Qué se hizo |
|------|------------|
| **SEO** | Meta tags, OG, Twitter Cards, Schema JSON-LD, sitemap, robots, canonical, hreflang |
| **GEO** | Snippet canónico para LLMs, datos estructurados, definiciones explícitas |
| **W3C** | HTML5 semántico, landmarks ARIA, un solo H1, validación |
| **WCAG 2.2 AA** | Skip link, focus-visible, aria-label, aria-live, role, reduced-motion, forced-colors |
| **Rendimiento** | defer, lazy loading, dns-prefetch, IntersectionObserver, DocumentFragment, debounce |
| **PWA** | manifest.json, Service Worker, instalable, offline-ready |
| **UX** | Portadas generativas (color por título), íconos por categoría, atajos de teclado, scroll infinito |

---

## 🔐 SEGURIDAD

- **Credenciales de Mega**: NO deben estar en el código de producción. Solo en scripts locales temporales
- **AdFoc.us**: Los links de descarga pasan por AdFoc.us para monetización
- **Service Worker**: Solo cachea assets propios, ignora rastreadores
- **Sanitización**: `escapeHTML()` y `escapeAttr()` en todos los datos que vienen de `biblioteca_datos.js`

---

## 🔬 VERIFICACIÓN DE CONTENIDO DE PDFs

Este proceso descarga las primeras ~512KB de cada PDF desde Mega, extrae el texto
de las páginas 2-4 (la página 1 suele ser propaganda) usando `pdf-parse`, y compara
el título/autor encontrado contra `biblioteca_datos.js`.

### Requisitos

```bash
npm install megajs pdf-parse
```

### Script de verificación

Crear `verificar_texto.js`:

```javascript
const mega = require('megajs');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const HEAD_BYTES = 524288; // 512KB
const CHECKPOINT = 'checkpoint.json';

// Cargar biblioteca
const raw = fs.readFileSync('biblioteca_datos.js', 'utf8');
const biblioteca = eval(raw.match(/\[([\s\S]*)\]/)[0]);

function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,' ').replace(/\s+/g,' ').trim(); }
function sim(a,b) { const na=norm(a),nb=norm(b); if(!na||!nb) return 0; if(na.includes(nb)||nb.includes(na)) return 0.9; const wa=new Set(na.split(' ').filter(w=>w.length>2)),wb=new Set(nb.split(' ').filter(w=>w.length>2)); if(!wa.size||!wb.size) return 0; let inter=0; for(const w of wa) if(wb.has(w)) inter++; return inter/(wa.size+wb.size-inter); }

function extractFromText(texto) {
    if (!texto || texto.length < 10) return { titulo: null, autor: null };
    const lines = texto.split(/\n/).map(l=>l.trim()).filter(l=>l.length>3);
    let titulo = null, autor = null;
    for (const line of lines.slice(0, 10)) {
        if (line.length > 10 && line.length < 120 && !/^(http|www|ISBN|©|copyright|contents|chapter)/i.test(line)) {
            titulo = line.replace(/\s{2,}/g,' ').trim(); break;
        }
    }
    const byMatch = lines.slice(0,15).join(' ').match(/(?:by|por|de)\s+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s\.\-]{3,40})/);
    if (byMatch) autor = byMatch[1].trim();
    if (!autor) {
        for (const line of lines.slice(0, 15)) {
            if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?$/.test(line) && line.length < 40) {
                if (line !== titulo && !/^(The|A|An|El|La|Los|Las|De|Del|En|Con|Por|Para)\b/i.test(line)) { autor = line; break; }
            }
        }
    }
    return { titulo, autor };
}

function findNode(root, nid) { /* recursivo — ver sync_mega.js */ }
function walkAll(nodes, path, arr) { /* recursivo — ver sync_mega.js */ }
async function downloadChunk(node, bytes) { /* ver verificar_metadatos.js */ }

const storage = new mega.Storage({ email: 'TU_EMAIL', password: 'TU_PASSWORD' });
storage.on('ready', async () => {
    const megaFiles = []; walkAll(storage.root.children||[], '/', megaFiles);
    
    // Matchear por nombre
    const matched = []; const used = new Set();
    for (const book of biblioteca) {
        let best=null, bestS=0;
        for (const mf of megaFiles) {
            if (used.has(mf.nodeId)) continue;
            const s = sim(book.titulo, mf.nombre)*0.7 + sim(book.autor, mf.nombre)*0.3;
            if (s>bestS && s>0.3) { bestS=s; best=mf; }
        }
        if (best) { matched.push({book,mf:best}); used.add(best.nodeId); }
    }

    // Checkpoint
    let cp = { done:0, results:[] };
    if (fs.existsSync(CHECKPOINT)) cp = JSON.parse(fs.readFileSync(CHECKPOINT,'utf8'));

    for (let i=cp.done; i<matched.length; i++) {
        const {book, mf} = matched[i];
        const node = findNode(storage.root, mf.nodeId);
        const buf = await downloadChunk(node, HEAD_BYTES);
        let pdfData = null;
        try { pdfData = await pdfParse(buf, { max: 5 }); } catch(e) {}
        let texto = pdfData?.text || '';
        // Saltar página 1 (propaganda)
        const pageBreak = texto.indexOf('\n\n');
        if (pageBreak > 50 && pageBreak < 500) texto = texto.substring(pageBreak).trim();
        const extraido = extractFromText(texto);
        
        cp.results.push({
            tituloActual: book.titulo, autorActual: book.autor,
            textoTit: extraido.titulo, textoAut: extraido.autor,
            nombreMega: mf.nombre
        });

        if ((i+1)%50===0) { cp.done=i+1; fs.writeFileSync(CHECKPOINT, JSON.stringify(cp)); }
    }

    // Reporte
    const discrepancias = cp.results.filter(r => {
        if (!r.textoTit && !r.textoAut) return false;
        const tOK = !r.textoTit || sim(r.tituloActual, r.textoTit) > 0.4;
        const aOK = !r.textoAut || sim(r.autorActual, r.textoAut) > 0.4;
        return !tOK || !aOK;
    });
    fs.writeFileSync('texto_reporte.json', JSON.stringify({
        total: matched.length,
        discrepancias: discrepancias.length,
        muestra: discrepancias.slice(0, 100)
    }, null, 2));
    console.log(`Discrepancias: ${discrepancias.length}/${matched.length}`);
    storage.close(); process.exit(0);
});
```

### Ejecución

```bash
# IMPORTANTE: Cambiar email/password en el script antes de ejecutar
node verificar_texto.js

# Tiempo estimado: 1.5-2 horas para 1,500+ PDFs
# El checkpoint permite retomar si se interrumpe
# Resultado en: texto_reporte.json
```

### Interpretación del reporte

- `discrepancias`: libros donde el título/autor extraído del PDF NO coincide con `biblioteca_datos.js`
- Revisar la `muestra` para decidir si corregir manualmente o confiar en los datos actuales
- Los PDFs sin metadatos extraíbles aparecen como `textoTit: null`

---

## 📦 DEPLOY

```bash
git add .
git commit -m "feat: descripción"
git push origin main
# GitHub Pages despliega automáticamente desde main
```

---

*Última actualización: Julio 2026 · 1,567 libros · 20 categorías · 594 KB*
