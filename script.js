/* ═══════════════════════════════════════════════════════════════════
   BIBLIOTECA CAÓTICA ARCANA — SCRIPT.JS
   Infinite Scroll | Search | Filters | PDF Viewer | Structured Data
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM References ─────────────────────────────────────────
    const estanteria = document.getElementById('estanteria');
    const buscador = document.getElementById('buscador');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroIdioma = document.getElementById('filtro-idioma');
    const totalLibrosEl = document.getElementById('total-libros');

    // ── State ──────────────────────────────────────────────────
    let todosLosLibros = [];
    let librosFiltradosActuales = [];
    let indiceLibrosMostrados = 0;
    const LIBROS_POR_PAGINA = 12;
    let estaCargando = false;
    let observer = null;

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

    // ── Update Meta Description with Live Count ────────────────
    function actualizarMetaDescription(total) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content',
                `Accede a la mayor colección gratuita de grimorios ocultistas en español: magia del caos, cábala, alquimia, tarot, wicca, hermetismo y más. +${total} libros esotéricos curados por Frater Alek0s. Descarga directa.`
            );
        }
    }

    // ── Mystic Symbols Generator ───────────────────────────────
    function generarSimbolosOcultos() {
        const simbolos = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ⊕⊗⊘⊚⊛⊜⊝⊞⊟⊠⊡⋄⋇⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭∴∵∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≡≢≤≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊌⊍⊎⊏⊐⊑⊒⊓⊔';
        let resultado = '';
        const cantidad = 130;
        for (let i = 0; i < cantidad; i++) {
            resultado += simbolos.charAt(Math.floor(Math.random() * simbolos.length));
            if (Math.random() > 0.94) resultado += '<br>';
        }
        return resultado;
    }

    // ── AdFoc.us Link Builder ──────────────────────────────────
    function crearLinkAdfocus(urlDestino) {
        const idUsuarioAdfocus = 757448;
        const urlParaAdfocus = urlDestino.replace('#', '%23');
        return `https://adfoc.us/serve/sitelinks/?id=${idUsuarioAdfocus}&url=${urlParaAdfocus}`;
    }

    // ── Detect if link is a direct PDF ─────────────────────────
    function esPDFDirecto(url) {
        return /\.pdf(\?.*)?$/i.test(url) && !url.includes('mega.nz');
    }

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
            const simbolos = generarSimbolosOcultos();
            const tituloId = `titulo-${sanitizeId(libro.titulo)}`;

            divLibro.innerHTML = `
                <a href="${linkAdfocus}" target="_blank" rel="noopener noreferrer"
                   class="preview-container"
                   title="Acceder al contenido de: ${escapeAttr(libro.titulo)}"
                   aria-label="Ver contenido de ${escapeAttr(libro.titulo)}">
                    <div class="symbol-preview" aria-hidden="true">${simbolos}</div>
                    <div class="preview-overlay"><span>Ver Contenido</span></div>
                </a>
                <h3 id="${tituloId}">${escapeHTML(libro.titulo)}</h3>
                <p class="autor">Por: ${escapeHTML(libro.autor)}</p>
                <p class="resumen">${escapeHTML(libro.resumen || 'No hay resumen disponible.')}</p>
                <span class="categoria">${escapeHTML(libro.categoria)}</span>
                <div class="libro-meta">
                    <span class="idioma">Idioma: ${escapeHTML(libro.idioma || 'No especificado')}</span>
                </div>
                <div class="libro-acciones">
                    <a href="${linkAdfocus}" target="_blank" rel="noopener noreferrer"
                       class="boton-principal"
                       aria-label="Descargar ${escapeAttr(libro.titulo)}">Descargar Tomo</a>
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
        indiceLibrosMostrados = fin;
        estaCargando = false;
    }

    // ── Helper: Sanitize HTML ──────────────────────────────────
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

    // Debounce search for performance
    let debounceTimer;
    function filtrarLibrosDebounced() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(filtrarLibros, 250);
    }

    // ── Intersection Observer (Infinite Scroll) ────────────────
    function configurarIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            // Crear un elemento centinela al final
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
            }, {
                rootMargin: '400px' // Preload 400px before reaching the end
            });

            observer.observe(sentinel);
        } else {
            // Fallback: scroll event
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
        if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement === document.body)) {
            e.preventDefault();
            buscador.focus();
        }
    });

    // ── Log ────────────────────────────────────────────────────
    console.log(`[Biblioteca Caótica Arcana] ${todosLosLibros.length} tomos indexados. Listo para servir sabiduría. 🕯️`);
});
