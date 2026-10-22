// Reparación del catálogo: nombres, autores, salas, resúmenes, descartes.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SALAS, norm, AUTORES, FAMILIA_SALA, REGLAS } = require('./diccionario.js');
const { OBRAS_A } = require('./obras_a.js');
const { OBRAS_B } = require('./obras_b.js');
const OBRAS = [...OBRAS_A, ...OBRAS_B];

const RAIZ = path.join(__dirname, '..');

// --- Carga -----------------------------------------------------------
const src = fs.readFileSync(path.join(__dirname, 'original.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + ';this.D = BIBLIOTECA_DATOS;', ctx);
const ORIGINAL = ctx.D;

// --- Mojibake --------------------------------------------------------
function arreglarMojibake(s) {
    return s
        .replace(/([a-záéíóúñ])¡([a-záéíóúñ])/gi, '$1í$2')
        .replace(/(\w)¢(\w)/g, '$1ó$2')
        .replace(/(\w)£(\w)/g, '$1ú$2')
        .replace(/µ(?=[A-ZÁÉÍÓÚÑ])/g, 'Á')
        .replace(/µ/g, 'á')
        .replace(/Ö/g, 'Í')
        .replace(/ç/g, 'Á')
        .replace(/î/g, 'Ó')
        .replace(/à/g, 'Ó')
        .replace(/¦/g, 'ó')
        .replace(/\u0090/g, 'É');
}

const BASURA = /\(\s*(?:bookfi\.org|bookfi|pdf|epub|ocr|z-lib[^)]*|1lib[^)]*|libgen[^)]*|b-ok[^)]*)\s*\)/gi;
const FUNC = /^(?:a|an|the|of|on|in|and|or|to|for|with|from|by|de|del|la|el|los|las|un|una|y|o|en|con|por|para|al|que|sobre|su|sus)$/i;
const GUIONES = /^[-–—\s]+|[-–—\s]+$/g;
const NOMBRE = /^[A-ZÁÉÍÓÚÑ][\w.'-]*(?:\s+[A-ZÁÉÍÓÚÑ][\w.'-]*){1,3}$/;

function pareceFragmento(s) {
    const w = norm(s).split(' ').filter(Boolean);
    if (!w.length) return false;
    return FUNC.test(w[0]) || FUNC.test(w[w.length - 1]);
}

function limpiarTitulo(titulo, autor) {
    let s = arreglarMojibake(titulo || '');
    let a = arreglarMojibake(autor || '');

    // [Autor]_Titulo  ->  autor + título
    const m = s.match(/^\s*\[([^\]]+)\]\s*(.+)$/);
    if (m) {
        if (/desconocid|anonymous|an[oó]nimo/i.test(a)) a = m[1].replace(/_/g, ' ').trim();
        s = m[2];
    }
    s = s.replace(BASURA, ' ');
    s = s.replace(/^(?:\([^)]*\)\s*)+/, '');
    s = s.replace(/_/g, ' ').replace(GUIONES, '');
    // nombre-de-archivo-con-guiones -> palabras
    if (!/\s/.test(s) && (s.match(/-/g) || []).length >= 2 && !/^[A-Z]{2,4}[-_]/.test(s)) {
        s = s.replace(/-/g, ' ');
    }
    if (!/\s/.test(s) && (s.match(/[a-z][A-Z]/g) || []).length >= 2) {
        s = s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ');
    }
    s = s.replace(/^(\d{2,4})\s*[-–—.)_]\s+(?=\D)/, '');   // "1998 - Rituales celtas"
    s = s.replace(/^\d{4,}\s*[.)\-_ ]+\s*/, '');            // IDs numéricos
    s = s.replace(/^\d{1,2}[.)]\s+(?=\D)/, '');             // "09. ..."
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/[.,;:]+$/, '').trim();
    s = s.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
    s = s.replace(/\s+(?:autor|author|by)$/i, '').trim();
    // "Autor - Titulo" cuando el autor coincide con el campo autor
    if (a) {
        const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reAutor = new RegExp('^' + esc + '\\s*[-–—:]*\\s*', 'i');
        if (reAutor.test(s)) s = s.replace(reAutor, '');
    }

    // Campos partidos: el "autor" es en realidad la segunda mitad del título
    const cuelga = /(?:^|\s)(?:of|the|de|del|la|las|los|el|y|and|a)$/i;
    if (a && a.length > 2 && !AUTORES[norm(a)] && norm(a) !== norm(s) &&
        (pareceFragmento(a) || cuelga.test(s))) {
        s = cuelga.test(s) ? `${s} ${a}` : `${a}: ${s}`;
        a = 'Autor Desconocido';
    }
    if (norm(s) === norm(a)) a = 'Autor Desconocido';
    s = s.replace(/\b(of|de|del|la|el|y|and|the)\s+\1\b/gi, '$1');
    // TODO MAYÚSCULAS -> Tipo Título
    if (s.length > 8 && s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(s)) {
        s = s.toLowerCase().replace(/(^|[\s\-–—:¿¡("'])([a-záéíóúñ])/g, (x, p, c) => p + c.toUpperCase());
        s = s.replace(/\b(De|Del|La|Las|Los|El|Y|En|Con|Por|Para|A|Al)\b/g, w => w.toLowerCase());
        s = s.charAt(0).toUpperCase() + s.slice(1);
    }
    return { titulo: s, autor: a };
}

// --- Autor -----------------------------------------------------------
const NO_AUTOR = /^(?:autor\s+)?desconocid[oa]$|^anonymous$|^an[oó]nimo$|^sin autor$|^varios$|^vv\.?\s?aa\.?$/;
const TEMAS = new Set(['alquimia', 'cabala', 'esoterismo', 'magia', 'magia negra', 'magia blanca', 'wicca', 'brujeria', 'ocultismo', 'satanismo', 'hermetismo', 'gnosticismo', 'teosofia', 'tarot', 'astrologia', 'runas', 'mitologia', 'religion', 'filosofia', 'psicologia', 'antropologia', 'sociologia', 'historia', 'literatura', 'poesia', 'arte', 'ciencia', 'medicina', 'hipnosis', 'grafologia', 'quiromancia', 'espiritismo', 'masoneria', 'templarios', 'rosacruces', 'iniciacion', 'ritual', 'grimorio', 'demonologia', 'angelologia', 'cristianismo', 'budismo', 'hinduismo', 'taoismo', 'yoga', 'tantra', 'chamanismo', 'vudu', 'santeria', 'umbanda', 'oculto', 'misticismo', 'simbolismo', 'magick', 'witchcraft', 'occultism']);

function limpiarAutor(autor) {
    let a = arreglarMojibake(autor || '')
        .replace(BASURA, ' ')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    a = a.replace(/^(?:autor|author|by|por)\s+/i, '').trim();
    a = a.replace(/\s+(?:autor|author)$/i, '').trim();
    a = a.replace(/^\(.*\)\s*/, '').trim();               // "(Literatura) (Medicina)..."
    a = a.replace(/[.,;:]+$/, '').trim();
    a = a.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
    a = a.replace(/\s*\([^)]*\)\s*$/, '').trim();          // "(pdf)", "(Peter West)"
    a = a.replace(/\d{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    a = a.replace(GUIONES, '').trim();

    const key = norm(a);
    if (!a || !key || NO_AUTOR.test(key) || TEMAS.has(key) || key.length > 45 || key.split(' ').length > 4 ||
        /https?:|www\.|mega\.nz|\.com|\.org/.test(a)) return 'Autor Desconocido';
    if (AUTORES[key]) return AUTORES[key];

    // "Apellido, Nombre" -> "Nombre Apellido"
    const coma = a.match(/^([^,]+),\s*([^,]+)$/);
    if (coma) {
        const apellido = coma[1].trim(), nombre = coma[2].trim();
        if (apellido.split(' ').length <= 3 && nombre.split(' ').length <= 3) {
            const vuelto = `${nombre} ${apellido}`;
            const k2 = norm(vuelto);
            if (AUTORES[k2]) return AUTORES[k2];
            return vuelto;
        }
    }
    // todo mayúsculas -> capitalizar
    if (a.length > 4 && a === a.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(a)) {
        a = a.toLowerCase().replace(/(^|[\s\-])([a-záéíóúñ])/g, (x, p, c) => p + c.toUpperCase());
    }
    return a;
}

// --- Descartes (fuera de tema) ---------------------------------------
const DESCARTES = [
    /carnegie|win friends|how to win friends/,
    /napoleon hill|piensa y hazte rico|think and grow rich/,
    /kevin trudeau|natural cures/,
    /kenrick cleveland|persuasion.*(?:art|science) of/,
    /melvin helitzer|humor.*(?:serious|business)/,
    /easy ?way to stop smoking|dejar de fumar/,
    /tapestry crochet|crochet|ganchillo|inspiritu jewelry|bisuteria|abalorios/,
    /dibujar manga|how to draw manga/,
    /la cocina como patrimonio|patrimonio gastronomico/,
    /la trata de esclavos|transatlantic slave trade/,
    /manual de caching|army.*caching|caching manual/,
    /harun yahya|harunyahya/,
    /jewish supremacism|the jewish utopia/,
    /hitler in argentina/,
    /brzezinski|global tyranny|the insiders|northwoods document|incredible rockefellers/,
    /structure of intelligence/,
    /el enigma de los dinosaurios/,
    /aromaterapia|aromatherapy/,
    /huerto familiar|el huerto/,
    /gastronomia|recetario|cocina tradicional/,
    /bdsm|jengibre y sus usos/,
    /^bofci|^70 45663$|^90 euros/,
    /^pvp$/,
    /manual de excel|wordpress para|marketing digital|seo para/
];

// --- Slop: se descarta todo resumen que no venga de OBRAS ------------
function esSlop(r) {
    if (!r || !r.trim()) return true;
    const s = norm(r);
    return /^obra (?:sobre|de)\b/.test(s) ||
        /\b(?:unveils?|delve|unlock|awaken|whisper|portal|journey into|ancient wisdom|hidden knowledge|forbidden|ultimate|profound|tesoro ancestral|saber oculto|desvela|portal a|mapa secreto|solo para quien|descifra|legado de saber|verdad ancestral|conocimiento oculto|magia interior|poder ancestral|secretos ancestrales)\b/.test(s);
}

// --- Idioma ----------------------------------------------------------
const ES = ['el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'un', 'una', 'para', 'con', 'por', 'sobre', 'como', 'sus', 'al'];
const EN = ['the', 'of', 'and', 'to', 'in', 'is', 'for', 'with', 'by', 'on', 'that', 'from', 'its', 'as', 'at', 'an', 'this'];

function idioma(b) {
    let x = b.idioma === 'Espanol' ? 'Español' : b.idioma;
    if (x !== 'Inglés') return x;
    const words = norm(b.titulo).split(' ').filter(Boolean);
    if (words.length < 3) return x;
    let es = 0, en = 0;
    words.forEach(w => { if (ES.includes(w)) es++; if (EN.includes(w)) en++; });
    if (/[ñ¿¡]/.test(b.titulo)) es += 2;
    return es >= 2 && es > en + 1 ? 'Español' : x;
}

// --- Clasificación ---------------------------------------------------
function clasificar(b) {
    const n = norm(b.titulo);
    for (const o of OBRAS) if (o.re.test(n)) return o;
    if (FAMILIA_SALA[b.autor]) return { s: FAMILIA_SALA[b.autor] };
    const txt = n + ' ' + norm(b.autor);
    for (const [re, s] of REGLAS) if (re.test(txt)) return { s };
    return { s: 22 };
}

// --- Proceso ---------------------------------------------------------
const vistos = new Set();
const libros = [], descartes = [], fusiones = [];
const stats = { autor: 0, titulo: 0, obra: 0, resumen: 0, idioma: 0, dup: 0 };

for (const b of ORIGINAL) {
    const lt = limpiarTitulo(b.titulo, b.autor);
    let autor = limpiarAutor(lt.autor || b.autor);
    let titulo = lt.titulo || '(Sin título)';
    if (!titulo || titulo.length < 2) titulo = '(Sin título)';

    // El título puede empezar por el autor en otro orden ("Orwell, George" -> "George Orwell")
    if (autor !== 'Autor Desconocido') {
        const reA = new RegExp('^' + autor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–—:]*\\s*', 'i');
        if (reA.test(titulo)) titulo = titulo.replace(reA, '').trim() || titulo;
    }

    // Si el campo "autor" contiene el título de una obra conocida, intercambiar
    if (!OBRAS.some(o => o.re.test(norm(titulo))) && OBRAS.some(o => o.re.test(norm(autor))) && autor !== 'Autor Desconocido') {
        const previo = titulo;
        titulo = autor;
        autor = NOMBRE.test(previo) ? previo : 'Autor Desconocido';
    }

    if (titulo !== b.titulo) stats.titulo++;
    if (autor !== b.autor) stats.autor++;

    if (DESCARTES.some(re => re.test(norm(titulo)))) {
        descartes.push({ titulo, autor, link: b.link, motivo: 'fuera de tema' });
        continue;
    }

    const obra = clasificar({ titulo, autor });
    const sala = obra.s;

    // Un título canónico muy corto solo se aplica si el original es igual de corto:
    // si no, la obra actúa como pista de sala y se conserva el título real del archivo.
    const palabrasObra = obra.t ? norm(obra.t).split(' ').filter(Boolean).length : 99;
    const palabrasTitulo = norm(titulo).split(' ').filter(Boolean).length;
    const aplicarTitulo = Boolean(obra.t) && (
        !(palabrasObra <= 2 && palabrasTitulo > palabrasObra + 1) ||
        norm(titulo).startsWith(norm(obra.t))
    );

    const resumen = aplicarTitulo ? (obra.r || '') : '';
    if (esSlop(b.resumen) || !resumen) stats.resumen++;
    if (aplicarTitulo) stats.obra++;

    // Obra conocida con autoría incierta: conservar el autor si parece un nombre
    const autorFinal = aplicarTitulo ? (obra.a === 'Autor Desconocido' && NOMBRE.test(autor) ? autor : obra.a) : autor;
    const tituloFinal = aplicarTitulo ? obra.t : titulo;

    // Deduplicar solo duplicados exactos (mismo título y autor de origen):
    // no se pierden volúmenes distintos de una misma obra.
    const clave = norm(titulo) + '|' + norm(autor);
    if (vistos.has(clave)) {
        stats.dup++;
        fusiones.push({ titulo: tituloFinal, autor: autorFinal, descartado: titulo, link: b.link });
        continue;
    }
    vistos.add(clave);

    const idiomaFinal = idioma({ ...b, titulo });
    if (idiomaFinal !== b.idioma) stats.idioma++;

    libros.push({
        autor: autorFinal,
        titulo: tituloFinal,
        resumen,
        categoria: SALAS[sala - 1],
        idioma: idiomaFinal,
        link: b.link,
        _s: sala
    });
}

libros.sort((x, y) => x._s - y._s ||
    (x.autor === 'Autor Desconocido') - (y.autor === 'Autor Desconocido') ||
    x.autor.localeCompare(y.autor, 'es') ||
    x.titulo.localeCompare(y.titulo, 'es'));

libros.forEach(b => delete b._s);

// --- Escritura -------------------------------------------------------
const cabecera = `/* ======================================================================
   BIBLIOTECA CAÓTICA ARCANA — CATÁLOGO OFICIAL
   ${libros.length} libros · ${SALAS.length} salas · Datos verificados
   Clasificación por salas, a la manera de una biblioteca real.
   Generado por _auditoria/reparar.js — no editar a mano.
   ====================================================================== */

const BIBLIOTECA_DATOS = [
`;
const cuerpo = libros.map(b => '    ' + JSON.stringify(b) + ',').join('\n');
fs.writeFileSync(path.join(RAIZ, 'biblioteca_datos.js'), cabecera + cuerpo + '\n];\n', 'utf8');

const porSala = {};
libros.forEach(b => { porSala[b.categoria] = (porSala[b.categoria] || 0) + 1; });
fs.writeFileSync(path.join(__dirname, 'informe.json'), JSON.stringify({
    total_original: ORIGINAL.length,
    total_final: libros.length,
    descartes: descartes.length,
    por_sala: porSala,
    stats,
    fusiones,
    lista_descartes: descartes
}, null, 2), 'utf8');

console.log('original', ORIGINAL.length, '-> final', libros.length, '| descartes', descartes.length);
console.log(stats);
console.log(porSala);
