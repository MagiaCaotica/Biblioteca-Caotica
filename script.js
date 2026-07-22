/* ═══════════════════════════════════════════════════════════════════
   BIBLIOTECA CAÓTICA ARCANA — SCRIPT.JS
   Portadas generativas | Mega.nz Embed | Modal Preview | Scroll Infinito
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM References ─────────────────────────────────────────
    const estanteria = document.getElementById('estanteria');
    const buscador = document.getElementById('buscador');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroIdioma = document.getElementById('filtro-idioma');
    const totalLibrosEl = document.getElementById('total-libros');
    const modalOverlay = document.getElementById('modal-preview');
    const modalTitle = document.getElementById('modal-title');
    const modalBookName = document.getElementById('modal-book-name');
    const modalClose = document.getElementById('modal-close');
    const modalObject = document.getElementById('modal-object');
    const modalIframe = document.getElementById('modal-iframe');
    const modalLoading = document.getElementById('modal-loading');
    const modalFallback = document.getElementById('modal-fallback');
    const modalDownload = document.getElementById('modal-download');
    const modalDirectLink = document.getElementById('modal-direct-link');
    const modalProgress = document.getElementById('modal-progress');
    const modalPdfViewer = document.getElementById('modal-pdf-viewer');
    const modalPdfCanvas = document.getElementById('modal-pdf-canvas');
    const pdfPrev = document.getElementById('pdf-prev');
    const pdfNext = document.getElementById('pdf-next');
    const pdfPageInfo = document.getElementById('pdf-page-info');

    // ── State ──────────────────────────────────────────────────
    let todosLosLibros = [];
    let librosFiltradosActuales = [];
    let indiceLibrosMostrados = 0;
    const LIBROS_POR_PAGINA = 12;
    let estaCargando = false;
    let observer = null;

    // ── Íconos para las portadas según categoría ────────────────
    const iconosCategoria = {
        'Magia del Caos': '☿',
        'Cábala': '🔯',
        'Alquimia': '⚗',
        'Tarot': '🂠',
        'Hermetismo': '☥',
        'Wicca y Brujería': '🌙',
        'Magia Práctica': '🕯',
        'Magia Sexual': '⚤',
        'Magia Moderna / DKMU': '🌆',
        'Satanismo y Luciferismo': '🐐',
        'Senda de la Mano Izquierda': '↜',
        'Grimorios Clásicos': '📜',
        'Grimorios / Genios': '🧞',
        'Runas y Tradición Nórdica': 'ᚱ',
        'Celtismo / Paganismo': '🌳',
        'Paganismo': '🍂',
        'Misterios Egipcios': '𓂀',
        'Gnosticismo': '✡',
        'Rosacrucismo': '🌹',
        'Órdenes Secretas': '🔑',
        'Ocultismo General': '🜁',
        'Ocultismo Clásico': '📖',
        'Ocultismo Comparado': '⚖',
        'Astrología': '🌌',
        'Clarividencia': '🔮',
        'Magia Herbolaria': '🌿',
        'Magia Tradicional': '🪄',
        'Teoría Mágica / Hiperstición': '⚡',
        'Tecnomagia': '💻',
        'Filosofía Oriental': '☯',
        'Espiritualidad': '🙏',
        'Mitología / Ocultismo': '🏛',
        'Biografía / Ocultismo': '👤',
        'Investigación': '🔍',
        'Entrevistas / Teoría': '🎙',
    };
    const iconoDefault = '📚';

    // ── Data Loading ───────────────────────────────────────────
    if (typeof BIBLIOTECA_DATOS !== 'undefined' && BIBLIOTECA_DATOS.length > 0) {
        todosLosLibros = BIBLIOTECA_DATOS.map(l => ({
            ...l,
            titulo: l.titulo || l.title || 'Tomo sin título',
            autor: l.autor || l.author || 'Autor Desconocido',
            resumen: l.resumen || l.summary || 'No hay resumen disponible.',
            categoria: l.categoria || l.category || 'Varios',
            idioma: l.idioma || l.language || 'No especificado',
            link: l.link || l.url || '#'
        }));

        popularIdiomas(todosLosLibros);
        popularCategorias(todosLosLibros);
        librosFiltradosActuales = [...todosLosLibros];
        iniciarVista();
        configurarIntersectionObserver();
        actualizarMetaDescription(todosLosLibros.length);
    } else {
        console.error('[Biblioteca] La variable BIBLIOTECA_DATOS no está definida o está vacía.');
        estanteria.innerHTML = '<div class="libro-placeholder" role="alert">No se pudo cargar la biblioteca. El grimorio de datos podría estar corrupto o ausente.</div>';
    }

    // ── Update Meta Description ────────────────────────────────
    function actualizarMetaDescription(total) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content',
                `Accede a la mayor colección gratuita de grimorios ocultistas en español: magia del caos, cábala, alquimia, tarot, wicca, hermetismo y más. +${total} libros esotéricos curados por Frater Alek0s. Descarga directa.`
            );
        }
    }

    // ── Color Generator from Title ─────────────────────────────
    function generarColorPortada(titulo) {
        let hash = 0;
        for (let i = 0; i < titulo.length; i++) {
            hash = titulo.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        const sat = 35 + (Math.abs(hash) % 25); // 35%–60% saturation
        const light = 18 + (Math.abs(hash >> 3) % 12); // 18%–30% lightness
        return {
            fondo: `hsl(${hue}, ${sat}%, ${light}%)`,
            acento: `hsl(${hue}, ${sat + 10}%, ${light + 10}%)`,
            borde: `hsl(${hue}, ${sat}%, ${light + 18}%)`,
        };
    }

    // ── Icon per Category ─────────────────────────────────────
    function obtenerIcono(categoria) {
        for (const [key, icono] of Object.entries(iconosCategoria)) {
            if (categoria.includes(key) || key.includes(categoria)) {
                return icono;
            }
        }
        return iconoDefault;
    }

    // ── Parse Mega URL → Embed URL ─────────────────────────────
    function parsearMegaUrl(url) {
        if (!url || !url.includes('mega.nz')) return null;

        // Formato 1: https://mega.nz/file/FILE_ID#KEY
        const matchFile = url.match(/mega\.nz\/file\/([^#]+)#(.+)/);
        if (matchFile) {
            return {
                fileId: matchFile[1],
                key: matchFile[2],
                embedUrl: `https://mega.nz/embed#!${matchFile[1]}!${matchFile[2]}`,
                esMega: true
            };
        }

        // Formato 2: https://mega.nz/#!FILE_ID!KEY (legacy)
        const matchLegacy = url.match(/mega\.nz\/#!([^!]+)!(.+)/);
        if (matchLegacy) {
            return {
                fileId: matchLegacy[1],
                key: matchLegacy[2],
                embedUrl: `https://mega.nz/embed#!${matchLegacy[1]}!${matchLegacy[2]}`,
                esMega: true
            };
        }

        return null;
    }

    // ── AdFoc.us Link Builder ──────────────────────────────────
    function crearLinkAdfocus(urlDestino) {
        const idUsuarioAdfocus = 757448;
        const urlParaAdfocus = urlDestino.replace('#', '%23');
        return `https://adfoc.us/serve/sitelinks/?id=${idUsuarioAdfocus}&url=${urlParaAdfocus}`;
    }

    // ── Modal: Render INLINE REAL con MegaClient + PDF.js ───────
    //      Descarga y descifra el PDF desde Mega, luego renderiza
    //      con PDF.js directamente en el modal. Sin iframe.
    let modalTimeout = null;
    let pdfDoc = null;
    let pdfPageNum = 1;
    let pdfTotalPages = 0;

    function resetModal() {
        clearTimeout(modalTimeout);
        modalObject.style.display = 'none'; modalObject.data = '';
        modalIframe.style.display = 'none'; modalIframe.src = '';
        modalPdfViewer.style.display = 'none';
        modalLoading.style.display = 'block';
        modalFallback.style.display = 'none';
        modalProgress.style.display = 'none';
        modalProgress.value = 0;
        pdfDoc = null; pdfPageNum = 1; pdfTotalPages = 0;
    }

    async function abrirModal(titulo, embedUrl, linkDescarga, linkMegaDirecto) {
        resetModal();
        modalTitle.textContent = titulo;
        modalBookName.textContent = titulo;
        modalDownload.href = linkDescarga;
        modalDirectLink.href = embedUrl;
        modalOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
        modalClose.focus();

        // Intentar render INLINE REAL con MegaClient
        if (typeof MegaClient !== 'undefined' && linkMegaDirecto) {
            modalProgress.style.display = 'block';
            try {
                const result = await MegaClient.download(linkMegaDirecto, (pct) => {
                    modalProgress.value = pct;
                });
                
                // ¡Descargado y descifrado! Renderizar con PDF.js
                await renderPDF(result.blob, titulo);
                return;
            } catch (e) {
                console.warn('[Modal] MegaClient falló:', e.message);
                // Caer a estrategia object/iframe
            }
        }

        // Fallback: intentar object → iframe → fallback links
        tryObject(embedUrl);
        modalTimeout = setTimeout(() => {
            if (modalFallback.style.display === 'none' && modalPdfViewer.style.display === 'none') {
                tryIframe(embedUrl);
                setTimeout(() => {
                    if (modalFallback.style.display === 'none' && modalPdfViewer.style.display === 'none') {
                        showFallback();
                    }
                }, 8000);
            }
        }, 6000);
    }

    // ── PDF.js Render ──────────────────────────────────────────
    async function renderPDF(blob, titulo) {
        modalTitle.textContent = titulo;
        modalLoading.style.display = 'none';
        modalObject.style.display = 'none';
        modalIframe.style.display = 'none';
        modalFallback.style.display = 'none';
        modalPdfViewer.style.display = 'flex';

        try {
            // Cargar PDF.js dinámicamente si no está disponible
            if (typeof pdfjsLib === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs';
                    script.type = 'module';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                // Esperar un momento a que el módulo se inicialice
                await new Promise(r => setTimeout(r, 500));
                if (typeof pdfjsLib === 'undefined') {
                    // Intentar import
                    const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs');
                    window.pdfjsLib = mod;
                }
            }

            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs';

            const arrayBuf = await blob.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
            pdfTotalPages = pdfDoc.numPages;
            pdfPageNum = 1;

            updatePdfButtons();
            await renderPage(1);

        } catch (e) {
            console.error('[PDF] Error:', e);
            showFallback();
        }
    }

    async function renderPage(num) {
        if (!pdfDoc || !modalPdfCanvas) return;
        const page = await pdfDoc.getPage(num);
        const container = modalPdfViewer.parentElement;
        const maxW = Math.min(container.clientWidth - 40, 900);
        const viewport = page.getViewport({ scale: 1 });
        const scale = maxW / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        modalPdfCanvas.height = scaledViewport.height;
        modalPdfCanvas.width = scaledViewport.width;

        const ctx = modalPdfCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        pdfPageNum = num;
        updatePdfButtons();
    }

    function updatePdfButtons() {
        pdfPrev.disabled = pdfPageNum <= 1;
        pdfNext.disabled = pdfPageNum >= pdfTotalPages;
        pdfPageInfo.textContent = `Pág ${pdfPageNum} / ${pdfTotalPages}`;
    }

    pdfPrev.addEventListener('click', () => { if (pdfPageNum > 1) renderPage(pdfPageNum - 1); });
    pdfNext.addEventListener('click', () => { if (pdfPageNum < pdfTotalPages) renderPage(pdfPageNum + 1); });
    document.addEventListener('keydown', (e) => {
        if (modalOverlay.hidden) return;
        if (e.key === 'ArrowLeft' && pdfDoc) { e.preventDefault(); if (pdfPageNum > 1) renderPage(pdfPageNum - 1); }
        if (e.key === 'ArrowRight' && pdfDoc) { e.preventDefault(); if (pdfPageNum < pdfTotalPages) renderPage(pdfPageNum + 1); }
    });

    // ── Estrategias fallback ───────────────────────────────────
    function tryObject(url) {
        modalObject.style.display = 'none'; modalObject.data = url;
    }
    function tryIframe(url) {
        modalIframe.style.display = 'none'; modalIframe.src = url;
    }
    function showFallback() {
        modalLoading.style.display = 'none';
        modalObject.style.display = 'none'; modalObject.data = '';
        modalIframe.style.display = 'none'; modalIframe.src = '';
        modalPdfViewer.style.display = 'none';
        modalFallback.style.display = 'block';
        clearTimeout(modalTimeout);
    }

    function cerrarModal() {
        clearTimeout(modalTimeout);
        modalOverlay.hidden = true;
        modalObject.data = ''; modalIframe.src = ''; pdfDoc = null;
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', cerrarModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) cerrarModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.hidden) cerrarModal();
    });

    // ── Render Books ───────────────────────────────────────────
    function mostrarLibros() {
        estaCargando = true;
        const fin = indiceLibrosMostrados + LIBROS_POR_PAGINA;
        const loteLibros = librosFiltradosActuales.slice(indiceLibrosMostrados, fin);
        const fragment = document.createDocumentFragment();

        if (indiceLibrosMostrados === 0 && loteLibros.length === 0) {
            estanteria.innerHTML = '<div class="libro-placeholder" role="status">Ningún tomo coincide con la consulta arcana.</div>';
            estaCargando = false;
            return;
        }

        loteLibros.forEach(libro => {
            const divLibro = document.createElement('div');
            divLibro.className = 'libro';
            divLibro.setAttribute('role', 'article');
            divLibro.setAttribute('aria-labelledby', `titulo-${sanitizeId(libro.titulo)}`);

            const linkAdfocus = crearLinkAdfocus(libro.link);
            const color = generarColorPortada(libro.titulo);
            const icono = obtenerIcono(libro.categoria);
            const tituloId = `titulo-${sanitizeId(libro.titulo)}`;
            const megaData = parsearMegaUrl(libro.link);

            // ── Construir HTML de la portada ────────────────────
            const portadaHTML = `
                <div class="portada-libro" role="img" aria-label="Portada de ${escapeAttr(libro.titulo)}">
                    <div class="portada-fondo" style="background: linear-gradient(160deg, ${color.acento} 0%, ${color.fondo} 40%, #0d0a07 100%);"></div>
                    <div class="portada-patron"></div>
                    <div class="portada-contenido">
                        <span class="portada-icono" aria-hidden="true">${icono}</span>
                        <div class="portada-marco">
                            <span class="portada-titulo">${escapeHTML(libro.titulo)}</span>
                            <span class="portada-autor">${escapeHTML(libro.autor)}</span>
                        </div>
                    </div>
                    <div class="portada-overlay">
                        <span class="portada-overlay-texto">Consultar</span>
                    </div>
                </div>
            `;

            // ── Construir botones ──────────────────────────────
            const botonesHTML = megaData ? `
                <div class="botones-libro">
                    <button class="boton-secundario btn-previsualizar"
                            data-embed="${escapeAttr(megaData.embedUrl)}"
                            data-mega="${escapeAttr(libro.link)}"
                            data-titulo="${escapeAttr(libro.titulo)}"
                            data-link="${escapeAttr(linkAdfocus)}"
                            aria-label="Consultar ${escapeAttr(libro.titulo)}">
                        Consultar
                    </button>
                    <a href="${linkAdfocus}" target="_blank" rel="noopener noreferrer"
                       class="boton-principal"
                       aria-label="Descargar ${escapeAttr(libro.titulo)}">
                        Descargar
                    </a>
                </div>
            ` : `
                <div class="botones-libro">
                    <a href="${linkAdfocus}" target="_blank" rel="noopener noreferrer"
                       class="boton-principal"
                       aria-label="Descargar ${escapeAttr(libro.titulo)}">
                        Descargar Tomo
                    </a>
                </div>
            `;

            // ── Armar tarjeta completa ─────────────────────────
            divLibro.innerHTML = `
                ${portadaHTML}
                <div class="libro-inner">
                    <h3 id="${tituloId}">${escapeHTML(libro.titulo)}</h3>
                    <p class="autor">${escapeHTML(libro.autor)}</p>
                    <p class="resumen">${escapeHTML(libro.resumen || 'No hay resumen disponible.')}</p>
                    <div class="libro-meta">
                        <span class="categoria">${escapeHTML(libro.categoria)}</span>
                        <span class="idioma">${escapeHTML(libro.idioma || 'No especificado')}</span>
                    </div>
                </div>
                <div class="libro-acciones">
                    ${botonesHTML}
                    <div class="botones-compartir">
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('He encontrado el tomo \'' + libro.titulo + '\' en la Biblioteca Ocultista:')}&url=${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}"
                           target="_blank" rel="noopener noreferrer"
                           class="boton-compartir"
                           title="Compartir en X/Twitter"
                           aria-label="Compartir ${escapeAttr(libro.titulo)} en X/Twitter">X</a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}&quote=${encodeURIComponent('He encontrado el tomo \'' + libro.titulo + '\' en la Biblioteca Ocultista')}"
                           target="_blank" rel="noopener noreferrer"
                           class="boton-compartir"
                           title="Compartir en Facebook"
                           aria-label="Compartir ${escapeAttr(libro.titulo)} en Facebook">f</a>
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('He encontrado el tomo \'' + libro.titulo + '\' en la Biblioteca Ocultista: https://magiacaotica.github.io/Biblioteca-Caotica/')}"
                           target="_blank" rel="noopener noreferrer"
                           class="boton-compartir"
                           title="Compartir en WhatsApp"
                           aria-label="Compartir ${escapeAttr(libro.titulo)} en WhatsApp">✆</a>
                    </div>
                </div>
            `;

            fragment.appendChild(divLibro);
        });

        estanteria.appendChild(fragment);

        // ── Vincular eventos de previsualizar ──────────────────
        const botonesPreview = estanteria.querySelectorAll('.btn-previsualizar');
        botonesPreview.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const embed = btn.getAttribute('data-embed');
                const titulo = btn.getAttribute('data-titulo');
                const link = btn.getAttribute('data-link');
                const megaLink = btn.getAttribute('data-mega');
                abrirModal(titulo, embed, link, megaLink);
            });
        });

        // ── Vincular click en portada → previsualizar ──────────
        const portadas = estanteria.querySelectorAll('.portada-libro');
        portadas.forEach(portada => {
            portada.addEventListener('click', () => {
                const btnPrev = portada.closest('.libro').querySelector('.btn-previsualizar');
                if (btnPrev) {
                    const embed = btnPrev.getAttribute('data-embed');
                    const titulo = btnPrev.getAttribute('data-titulo');
                    const link = btnPrev.getAttribute('data-link');
                    const megaLink = btnPrev.getAttribute('data-mega');
                    abrirModal(titulo, embed, link, megaLink);
                }
            });
        });

        indiceLibrosMostrados = fin;
        estaCargando = false;
    }

    // ── Helper Functions ───────────────────────────────────────
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`/g, '&#96;');
    }

    function sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9\u00C0-\u024F\-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'tomo';
    }

    // ── Init / Reset View ──────────────────────────────────────
    function iniciarVista() {
        indiceLibrosMostrados = 0;
        estanteria.innerHTML = '';
        totalLibrosEl.textContent = `${librosFiltradosActuales.length} tomos encontrados.`;

        if (librosFiltradosActuales.length === 0) {
            estanteria.innerHTML = '<div class="libro-placeholder" role="status">Ningún tomo coincide con la consulta arcana. Prueba con otros términos o filtros.</div>';
            return;
        }

        mostrarLibros();
    }

    // ── Populate Category Dropdown ─────────────────────────────
    function popularCategorias(libros) {
        const categorias = new Set();
        libros.forEach(libro => {
            if (libro.categoria) categorias.add(libro.categoria);
        });

        const categoriasOrdenadas = Array.from(categorias).sort((a, b) => a.localeCompare(b, 'es'));
        categoriasOrdenadas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filtroCategoria.appendChild(option);
        });
    }

    // ── Populate Language Dropdown ─────────────────────────────
    function popularIdiomas(libros) {
        const idiomas = new Set();
        libros.forEach(libro => {
            if (libro.idioma) idiomas.add(libro.idioma);
        });

        const idiomasOrdenados = Array.from(idiomas).sort((a, b) => a.localeCompare(b, 'es'));
        idiomasOrdenados.forEach(idioma => {
            const option = document.createElement('option');
            option.value = idioma;
            option.textContent = idioma;
            filtroIdioma.appendChild(option);
        });
    }

    // ── Filter & Search ────────────────────────────────────────
    function filtrarLibros() {
        const textoBusqueda = buscador.value.toLowerCase().trim();
        const categoriaSeleccionada = filtroCategoria.value;
        const idiomaSeleccionado = filtroIdioma.value;

        librosFiltradosActuales = todosLosLibros.filter(libro => {
            const coincideBusqueda = !textoBusqueda ||
                (libro.titulo || '').toLowerCase().includes(textoBusqueda) ||
                (libro.autor || '').toLowerCase().includes(textoBusqueda) ||
                (libro.resumen || '').toLowerCase().includes(textoBusqueda);

            const coincideCategoria = categoriaSeleccionada === 'todos' || libro.categoria === categoriaSeleccionada;
            const coincideIdioma = idiomaSeleccionado === 'todos' || libro.idioma === idiomaSeleccionado;

            return coincideBusqueda && coincideCategoria && coincideIdioma;
        });

        iniciarVista();
    }

    let debounceTimer;
    function filtrarLibrosDebounced() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(filtrarLibros, 250);
    }

    // ── Intersection Observer (Infinite Scroll) ────────────────
    function configurarIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const sentinel = document.createElement('div');
            sentinel.id = 'scroll-sentinel';
            sentinel.style.height = '1px';
            sentinel.style.width = '100%';
            sentinel.setAttribute('aria-hidden', 'true');
            document.querySelector('main').appendChild(sentinel);

            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !estaCargando && indiceLibrosMostrados < librosFiltradosActuales.length) {
                        mostrarLibros();
                    }
                });
            }, { rootMargin: '400px' });

            observer.observe(sentinel);
        } else {
            let scrollTicking = false;
            window.addEventListener('scroll', () => {
                if (!scrollTicking) {
                    requestAnimationFrame(() => {
                        if (!estaCargando &&
                            indiceLibrosMostrados < librosFiltradosActuales.length &&
                            (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
                            mostrarLibros();
                        }
                        scrollTicking = false;
                    });
                    scrollTicking = true;
                }
            }, { passive: true });
        }
    }

    // ── Event Listeners ────────────────────────────────────────
    buscador.addEventListener('input', filtrarLibrosDebounced);
    filtroCategoria.addEventListener('change', filtrarLibros);
    filtroIdioma.addEventListener('change', filtrarLibros);

    // Keyboard shortcut: Ctrl+K or / to focus search
    document.addEventListener('keydown', (e) => {
        if (modalOverlay.hidden && ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement === document.body))) {
            e.preventDefault();
            buscador.focus();
        }
    });

    // ── Log ────────────────────────────────────────────────────
    const librosConMega = todosLosLibros.filter(l => l.link && l.link.includes('mega.nz')).length;
    console.log(`[Biblioteca Caótica Arcana] ${todosLosLibros.length} tomos indexados · ${librosConMega} con previsualización Mega.nz · Listo 🕯️`);

    // ── Contador de visitas (localStorage) ──────────────────────
    function actualizarContador() {
        const el = document.getElementById('contador-numero');
        if (!el) return;

        // Leer contador actual
        let count = parseInt(localStorage.getItem('biblio_visitas') || '0', 10);

        // Incrementar solo una vez por sesión
        const sesionId = sessionStorage.getItem('biblio_sesion');
        if (!sesionId) {
            count++;
            localStorage.setItem('biblio_visitas', count.toString());
            sessionStorage.setItem('biblio_sesion', Date.now().toString());
        }

        // Formatear número
        el.textContent = count.toLocaleString('es');
    }
    actualizarContador();
});
