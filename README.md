# 📚 Biblioteca Caótica Arcana

> *"Quien con monstruos lucha, cuide de convertirse a su vez en monstruo."* — Nietzsche

**La mayor colección gratuita de grimorios, textos prohibidos y sabiduría esotérica en español.**

🔗 **[https://magiacaotica.github.io/Biblioteca-Caotica/](https://magiacaotica.github.io/Biblioteca-Caotica/)**

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| **Libros indexados** | 1,365+ |
| **Categorías** | 38 (Magia del Caos, Cábala, Alquimia, Tarot, Wicca, Hermetismo...) |
| **Idiomas** | Español, Inglés, Francés |
| **Tamaño de datos** | ~0.79 MB |
| **Peso total página** | < 1 MB (sin contar fuentes externas) |

---

## 🚀 Características

- 🔍 **Buscador completo** por título, autor y resumen
- 🏷️ **Filtros** por categoría (38 categorías) e idioma (ES/EN/FR)
- ♾️ **Scroll infinito** con Intersection Observer (12 libros por lote)
- 🌐 **Traducción automática** a 10 idiomas vía Google Translate
- 📤 **Compartir** en X/Twitter, Facebook y WhatsApp
- 💰 **Monetización** vía AdFoc.us (pago por descarga)
- 🎨 **Diseño temático oscuro** con estética ocultista
- 📱 **Responsive** (mobile-first, tablets, desktop)
- ♿ **Accesibilidad WCAG 2.2 AA**: skip links, ARIA landmarks, focus visible, screen reader
- 🔍 **SEO optimizado**: Schema.org JSON-LD, Open Graph, Twitter Cards, meta tags, sitemap, robots.txt
- 🤖 **GEO optimizado**: Respuestas directas para LLMs, FAQ implícito, datos estructurados
- 📄 **Visor PDF online** (`leer.html?url=...`) para documentos con enlace directo
- 📲 **PWA**: Service Worker, manifest, caché offline
- 🎯 **Atajo de teclado**: `Ctrl+K` o `/` para buscar

---

## 📁 Estructura del Proyecto

```
Biblioteca-Caotica/
├── index.html              ← Página principal (SEO + GEO + W3C + Schema)
├── style.css               ← Estilos (WCAG AA, responsive, print)
├── script.js               ← Lógica (scroll infinito, filtros, búsqueda)
├── biblioteca_datos.js     ← Base de datos (1,365 libros, ~0.79 MB)
├── leer.html               ← Visor PDF online con PDF.js
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service Worker (cache-first, offline)
├── robots.txt              ← Reglas de crawling
├── sitemap.xml             ← Sitemap para buscadores
├── 404.html                ← Página de error personalizada
├── tomo_placeholder.svg    ← Ícono SVG
└── README.md               ← Este archivo
```

---

## 🔧 Uso del Visor PDF

Para leer un PDF directamente en el navegador (solo funciona con enlaces directos, **NO** con Mega.nz):

```
https://magiacaotica.github.io/Biblioteca-Caotica/leer.html?url=URL_DEL_PDF&titulo=TITULO
```

**Ejemplo:**
```
leer.html?url=https://ejemplo.com/libro.pdf&titulo=El%20Gran%20Grimorio
```

> ⚠️ **Limitación**: Los archivos alojados en Mega.nz usan cifrado cliente-servidor y **no pueden** ser visualizados directamente. Deben descargarse. El visor solo funciona con PDFs de acceso público directo.

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|-----------|-----|
| **HTML5** semántico | Estructura W3C-compliant |
| **CSS3** (Custom Properties) | Tema oscuro, responsive, animaciones |
| **JavaScript (ES6+)** | Scroll infinito, filtros, interacción |
| **Schema.org JSON-LD** | Structured data para SEO |
| **PDF.js 4.7** | Visor PDF en navegador |
| **Service Worker** | Caché offline, PWA |
| **Google Fonts** | Cinzel (títulos) + Lora (cuerpo) |
| **GitHub Pages** | Hosting gratuito |

---

## 🙏 Curador

**Frater Alek0s** — [Blog Grimorio Magia del Caos](https://grimoriomagiadelcaos.blogspot.com) | [YouTube](https://www.youtube.com/@MagiaCaoticaMagiadelCaos) | [Telegram](https://t.me/magiacaotica)

---

*Todo el material compartido tiene fines educativos, de investigación y preservación cultural.*
