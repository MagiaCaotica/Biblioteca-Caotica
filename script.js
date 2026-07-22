/* ═══════════════════════════════════════════════════════════════════
   BIBLIOTECA CAÓTICA ARCANA — SCRIPT.JS
   ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const estanteria = document.getElementById('estanteria');
    const buscador = document.getElementById('buscador');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroIdioma = document.getElementById('filtro-idioma');
    const totalLibrosEl = document.getElementById('total-libros');
    const modalOverlay = document.getElementById('modal-preview');
    const modalTitle = document.getElementById('modal-title');
    const modalIframe = document.getElementById('modal-iframe');
    const modalClose = document.getElementById('modal-close');
    const modalDownload = document.getElementById('modal-download');

    let todosLosLibros = [], librosFiltradosActuales = [], indiceLibrosMostrados = 0;
    const LIBROS_POR_PAGINA = 12;
    let estaCargando = false, observer = null;

    const iconosCategoria = {
        'Magia del Caos':'☿','Cábala y Misticismo':'🔯','Hermetismo y Alquimia':'⚗','Adivinación y Artes Adivinatorias':'🔮',
        'Brujería, Wicca y Paganismo':'🌙','Magia Práctica y Hechicería':'🕯','Ocultismo Oriental':'☯','Satanismo y Senda de la Mano Izquierda':'🐐',
        'Grimorios y Magia Ceremonial':'📜','Runas y Tradición Nórdica':'ᚱ','Misterios Egipcios y Oriente Medio':'𓂀',
        'Gnosticismo y Cristianismo Esotérico':'✡','Historia del Ocultismo':'📖','Filosofía Oculta y Teoría Mágica':'⚡',
        'Tecnomagia y Ocultismo Contemporáneo':'💻','Espiritualidad y Desarrollo Personal':'🙏','Ufología y Misterios':'🛸',
        'Literatura y Ficción Ocultista':'✒','Textos Clásicos y Referencia':'📚','Ocultismo General':'🜁'
    };
    const iconoDefault = '📚';

    // ── Carga de datos ─────────────────────────────────────────
    if (typeof BIBLIOTECA_DATOS !== 'undefined' && BIBLIOTECA_DATOS.length > 0) {
        todosLosLibros = BIBLIOTECA_DATOS.map(l => ({
            ...l, titulo: l.titulo || l.title || 'Tomo sin título',
            autor: l.autor || l.author || 'Autor Desconocido',
            resumen: l.resumen || l.summary || 'No hay resumen disponible.',
            categoria: l.categoria || l.category || 'Ocultismo General',
            idioma: l.idioma || l.language || 'No especificado',
            link: l.link || l.url || '#'
        }));
        popularIdiomas(todosLosLibros); popularCategorias(todosLosLibros);
        librosFiltradosActuales = [...todosLosLibros];
        iniciarVista(); configurarIntersectionObserver();
        actualizarMetaDescription(todosLosLibros.length);
    } else {
        estanteria.innerHTML = '<div class="libro-placeholder" role="alert">No se pudo cargar la biblioteca.</div>';
    }

    function actualizarMetaDescription(total) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', meta.getAttribute('content').replace(/\+[\d,]+/, '+' + total));
    }

    // ── Helpers ────────────────────────────────────────────────
    function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function escapeAttr(s) { return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/`/g,'&#96;'); }
    function sanitizeId(s) { return (s||'').replace(/[^a-zA-Z0-9\u00C0-\u024F\-_]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').toLowerCase() || 'tomo'; }
    function crearLinkAdfocus(url) { return 'https://adfoc.us/serve/sitelinks/?id=757448&url=' + (url||'').replace('#','%23'); }
    function parsearMegaUrl(url) { const m = (url||'').match(/mega\.nz\/file\/([^#]+)#(.+)/); return m ? { fileId: m[1], key: m[2], embedUrl: 'https://mega.nz/embed#!'+m[1]+'!'+m[2] } : null; }

    function generarColorPortada(titulo) {
        let hash = 0; for (let i=0;i<(titulo||'').length;i++) hash = titulo.charCodeAt(i)+((hash<<5)-hash);
        const hue = Math.abs(hash)%360, sat = 35+(Math.abs(hash)%25), light = 18+(Math.abs(hash>>3)%12);
        return { fondo: `hsl(${hue},${sat}%,${light}%)`, acento: `hsl(${hue},${sat+10}%,${light+10}%)` };
    }
    function obtenerIcono(cat) { for (const [k,v] of Object.entries(iconosCategoria)) if ((cat||'').includes(k)||k.includes(cat||'')) return v; return iconoDefault; }

    // ── Render ─────────────────────────────────────────────────
    function mostrarLibros() {
        estaCargando = true;
        const fin = indiceLibrosMostrados + LIBROS_POR_PAGINA;
        const lote = librosFiltradosActuales.slice(indiceLibrosMostrados, fin);
        const frag = document.createDocumentFragment();
        if (indiceLibrosMostrados === 0 && lote.length === 0) {
            estanteria.innerHTML = '<div class="libro-placeholder" role="status">Ningún tomo coincide.</div>';
            estaCargando = false; return;
        }
        lote.forEach(libro => {
            const div = document.createElement('div'); div.className = 'libro'; div.setAttribute('role','article');
            div.setAttribute('aria-labelledby','titulo-'+sanitizeId(libro.titulo));
            const adfocus = crearLinkAdfocus(libro.link), color = generarColorPortada(libro.titulo);
            const icono = obtenerIcono(libro.categoria), tid = 'titulo-'+sanitizeId(libro.titulo);
            const mega = parsearMegaUrl(libro.link);
            div.innerHTML = `
                <div class="portada-libro" role="img" aria-label="Portada de ${escapeAttr(libro.titulo)}">
                    <div class="portada-fondo" style="background:linear-gradient(160deg,${color.acento} 0%,${color.fondo} 40%,#0d0a07 100%);"></div>
                    <div class="portada-patron"></div>
                    <div class="portada-contenido">
                        <span class="portada-icono" aria-hidden="true">${icono}</span>
                        <div class="portada-marco">
                            <span class="portada-titulo">${escapeHTML(libro.titulo)}</span>
                            <span class="portada-autor">${escapeHTML(libro.autor)}</span>
                        </div>
                    </div>
                    <div class="portada-overlay"><span class="portada-overlay-texto">Consultar</span></div>
                </div>
                <div class="libro-inner">
                    <h3 id="${tid}">${escapeHTML(libro.titulo)}</h3>
                    <p class="autor">${escapeHTML(libro.autor)}</p>
                    <p class="resumen">${escapeHTML(libro.resumen||'')}</p>
                    <div class="libro-meta">
                        <span class="categoria">${escapeHTML(libro.categoria)}</span>
                        <span class="idioma">${escapeHTML(libro.idioma||'')}</span>
                    </div>
                </div>
                <div class="libro-acciones">
                    ${mega?`
                    <div class="botones-libro">
                        <button class="boton-secundario btn-previsualizar" data-url="${escapeAttr(libro.link)}" data-titulo="${escapeAttr(libro.titulo)}" data-dl="${escapeAttr(adfocus)}">Consultar</button>
                        <a href="${adfocus}" target="_blank" rel="noopener noreferrer" class="boton-principal">Descargar</a>
                    </div>`:`
                    <div class="botones-libro">
                        <a href="${adfocus}" target="_blank" rel="noopener noreferrer" class="boton-principal">Descargar Tomo</a>
                    </div>`}
                    <div class="botones-compartir">
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('He encontrado \''+libro.titulo+'\' en la Biblioteca Ocultista:')}&url=${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}" target="_blank" rel="noopener noreferrer" class="boton-compartir" title="X/Twitter">X</a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}" target="_blank" rel="noopener noreferrer" class="boton-compartir" title="Facebook">f</a>
                        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(libro.titulo+' — Biblioteca Ocultista: https://magiacaotica.github.io/Biblioteca-Caotica/')}" target="_blank" rel="noopener noreferrer" class="boton-compartir" title="WhatsApp">✆</a>
                    </div>
                </div>`;
            frag.appendChild(div);
        });
        estanteria.appendChild(frag);
        estanteria.querySelectorAll('.btn-previsualizar').forEach(b => b.addEventListener('click',function(e){
            e.preventDefault(); abrirModal(this.getAttribute('data-titulo'), this.getAttribute('data-url'), this.getAttribute('data-dl'));
        }));
        estanteria.querySelectorAll('.portada-libro').forEach(p => {
            p.addEventListener('click',()=>{ const b = p.closest('.libro').querySelector('.btn-previsualizar'); if(b) b.click(); });
            p.addEventListener('mouseenter',()=>cargarThumbnail(p));
        });
        indiceLibrosMostrados = fin; estaCargando = false;
    }

    // ── Modal INLINE ───────────────────────────────────────────
    function abrirModal(titulo, megaUrl, linkDescarga) {
        modalTitle.textContent = titulo;
        modalDownload.href = linkDescarga;
        modalIframe.src = megaUrl;
        modalOverlay.hidden = false;
        document.body.style.overflow = 'hidden';
        modalClose.focus();
    }
    function cerrarModal() { modalOverlay.hidden = true; modalIframe.src = ''; document.body.style.overflow = ''; }
    modalClose.addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', e => { if(e.target===modalOverlay) cerrarModal(); });
    document.addEventListener('keydown', e => { if(e.key==='Escape'&&!modalOverlay.hidden) cerrarModal(); });

    // ── Vista / Filtros ────────────────────────────────────────
    function iniciarVista() {
        indiceLibrosMostrados = 0; estanteria.innerHTML = '';
        totalLibrosEl.textContent = librosFiltradosActuales.length + ' tomos encontrados.';
        if (librosFiltradosActuales.length===0) { estanteria.innerHTML='<div class="libro-placeholder">Sin resultados.</div>'; return; }
        mostrarLibros();
    }
    function popularCategorias(libros) {
        const cats = new Set(); libros.forEach(l=>{if(l.categoria) cats.add(l.categoria);});
        [...cats].sort((a,b)=>a.localeCompare(b,'es')).forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; filtroCategoria.appendChild(o); });
    }
    function popularIdiomas(libros) {
        const langs = new Set(); libros.forEach(l=>{if(l.idioma) langs.add(l.idioma);});
        [...langs].sort((a,b)=>a.localeCompare(b,'es')).forEach(l=>{ const o=document.createElement('option'); o.value=l; o.textContent=l; filtroIdioma.appendChild(o); });
    }
    function filtrarLibros() {
        const q = buscador.value.toLowerCase().trim(), c = filtroCategoria.value, i = filtroIdioma.value;
        librosFiltradosActuales = todosLosLibros.filter(libro => {
            const matchQ = !q || (libro.titulo||'').toLowerCase().includes(q) || (libro.autor||'').toLowerCase().includes(q) || (libro.resumen||'').toLowerCase().includes(q) || (libro.categoria||'').toLowerCase().includes(q);
            return matchQ && (c==='todos'||libro.categoria===c) && (i==='todos'||libro.idioma===i);
        });
        iniciarVista();
    }
    let debounce; buscador.addEventListener('input',()=>{clearTimeout(debounce);debounce=setTimeout(filtrarLibros,250);});
    filtroCategoria.addEventListener('change', filtrarLibros);
    filtroIdioma.addEventListener('change', filtrarLibros);

    // ── Scroll ─────────────────────────────────────────────────
    function configurarIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const s = document.createElement('div'); s.id='scroll-sentinel'; s.style.cssText='height:1px;width:100%'; s.setAttribute('aria-hidden','true');
            document.querySelector('main').appendChild(s);
            observer = new IntersectionObserver(e=>{ if(e[0].isIntersecting&&!estaCargando&&indiceLibrosMostrados<librosFiltradosActuales.length) mostrarLibros(); },{rootMargin:'400px'});
            observer.observe(s);
        }
    }

    // ── Thumbnails ─────────────────────────────────────────────
    const thumbCache = new Map();
    async function cargarThumbnail(portada) {
        const btn = portada.closest('.libro')?.querySelector('.btn-previsualizar');
        if (!btn) return;
        const url = btn.getAttribute('data-url');
        if (!url || thumbCache.has(url)) return;
        thumbCache.set(url, null);
        try {
            if (typeof MegaClient !== 'undefined') {
                const thumb = await MegaClient.getThumbnail(url, 320);
                if (thumb) { thumbCache.set(url, thumb); const f = portada.querySelector('.portada-fondo'); if(f){f.style.backgroundImage='url('+thumb+')';f.style.backgroundSize='cover';f.style.backgroundPosition='center';} }
            }
        } catch(e) {}
    }

    // ── Contador ───────────────────────────────────────────────
    (function(){
        const el = document.getElementById('contador-numero'); if(!el) return;
        let c = parseInt(localStorage.getItem('biblio_visitas')||'0',10);
        if(!sessionStorage.getItem('biblio_sesion')){c++;localStorage.setItem('biblio_visitas',c);sessionStorage.setItem('biblio_sesion',Date.now());}
        el.textContent = c.toLocaleString('es');
    })();

    // ── Atajos ─────────────────────────────────────────────────
    document.addEventListener('keydown', e => { if(modalOverlay.hidden&&((e.ctrlKey&&e.key==='k')||(e.key==='/'&&document.activeElement===document.body))){e.preventDefault();buscador.focus();} });

    console.log('[Biblioteca Caótica Arcana] '+todosLosLibros.length+' tomos · Listo 🕯️');
});
