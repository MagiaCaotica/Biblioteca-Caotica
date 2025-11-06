document.addEventListener('DOMContentLoaded', () => {
    const estanteria = document.getElementById('estanteria');
    const buscador = document.getElementById('buscador');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroIdioma = document.getElementById('filtro-idioma');
    const totalLibrosEl = document.getElementById('total-libros');
    let todosLosLibros = [];
    let librosFiltradosActuales = [];
    let indiceLibrosMostrados = 0;
    const LIBROS_POR_PAGINA = 12; // Un número divisible por 2, 3 y 4 para un buen grid.
    let estaCargando = false;
    // Usar los datos incrustados desde biblioteca_datos.js
    if (typeof BIBLIOTECA_DATOS !== 'undefined' && BIBLIOTECA_DATOS.length > 0) {
        todosLosLibros = BIBLIOTECA_DATOS;
        popularIdiomas(todosLosLibros);
        popularCategorias(todosLosLibros);
        librosFiltradosActuales = [...todosLosLibros];
        iniciarVista();
    } else {
        // Este mensaje solo aparecerá si biblioteca_datos.js no se carga o está vacío.
        console.error('Error: La variable BIBLIOTECA_DATOS no está definida o está vacía.');
        estanteria.innerHTML = '<p class="libro-placeholder">No se pudo cargar la biblioteca. El grimorio de datos podría estar corrupto o ausente.</p>';
    }

    /**
     * Genera una cadena de texto con símbolos de aspecto ocultista.
     * @returns {string} Una cadena de texto con símbolos aleatorios.
     */
    function generarSimbolosOcultos() {
        const simbolos = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ⊕⊗⊘⊚⊛⊜⊝⊞⊟⊠⊡⋄⋇⋈⋉⋊⋋⋌⋍⋎⋏⋐⋑⋒⋓⋔⋕⋖⋗⋘⋙⋚⋛⋜⋝⋞⋟⋠⋡⋢⋣⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭∴∵∷∸∹∺∻∼∽∾∿≀≁≂≃≄≅≆≇≈≉≊≋≌≍≎≏≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≡≢≤≥≦≧≨≩≪≫≬≭≮≯≰≱≲≳≴≵≶≷≸≹≺≻≼≽≾≿⊀⊁⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊌⊍⊎⊏⊐⊑⊒⊓⊔";
        let resultado = '';
        const cantidad = 150; // Reducimos la cantidad de símbolos para que quepan mejor
        for (let i = 0; i < cantidad; i++) {
            resultado += simbolos.charAt(Math.floor(Math.random() * simbolos.length));
            if (Math.random() > 0.95) {
                resultado += '<br>'; // Añade saltos de línea aleatorios
            }
        }
        return resultado;
    }

    /**
     * Crea un enlace de AdFoc.us a partir de una URL de destino.
     * @param {string} urlDestino La URL original (ej. el enlace de Mega).
     * @returns {string} La URL de AdFoc.us formateada.
     */
    function crearLinkAdfocus(urlDestino) {
        const idUsuarioAdfocus = 757448;
        // El carácter '#' en la URL de Mega debe ser codificado como '%23' para que se pase
        // correctamente como parte del parámetro 'url' a AdFoc.us. De lo contrario, el navegador
        // lo interpreta como un ancla y no lo envía al servidor.
        const urlParaAdfocus = urlDestino.replace('#', '%23');
        return `https://adfoc.us/serve/sitelinks/?id=${idUsuarioAdfocus}&url=${urlParaAdfocus}`;
    }

    // Función para mostrar los libros en la página
    function mostrarLibros() {
        estaCargando = true;
        const fin = indiceLibrosMostrados + LIBROS_POR_PAGINA;
        const loteLibros = librosFiltradosActuales.slice(indiceLibrosMostrados, fin);

        if (indiceLibrosMostrados === 0 && loteLibros.length === 0) {
            estanteria.innerHTML = '<p class="libro-placeholder">Ningún tomo coincide con la consulta arcana.</p>';
            estaCargando = false;
            return;
        }

        loteLibros.forEach(libro => {
            const divLibro = document.createElement('div');
            divLibro.className = 'libro';
            
            divLibro.innerHTML = `
                <a href="${crearLinkAdfocus(libro.link)}" target="_blank" rel="noopener noreferrer" class="preview-container" title="Acceder al contenido de: ${libro.titulo}">
                    <div class="symbol-preview">${generarSimbolosOcultos()}</div>
                    <div class="preview-overlay"><span>Ver Contenido</span>
                    </div>
                </a>
                <h3>${libro.titulo}</h3>
                <p class="autor">Por: ${libro.autor}</p>
                <p class="resumen">${libro.resumen || 'No hay resumen disponible.'}</p>
                <p class="categoria">${libro.categoria}</p>
                <div class="libro-meta">
                    <p class="idioma">Idioma: ${libro.idioma || 'No especificado'}</p>
                </div>
                <div class="libro-acciones">
                    <a href="${crearLinkAdfocus(libro.link)}" target="_blank" rel="noopener noreferrer" class="boton-principal">Descargar Tomo</a>
                    <div class="botones-compartir">
                        <a href="https://twitter.com/intent/tweet?text=He%20encontrado%20el%20tomo%20'${encodeURIComponent(libro.titulo)}'%20en%20la%20Biblioteca%20Ocultista:&url=${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}" target="_blank" rel="noopener noreferrer" class="boton-compartir" title="Compartir en X/Twitter">X</a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}&quote=He%20encontrado%20el%20tomo%20'${encodeURIComponent(libro.titulo)}'%20en%20la%20Biblioteca%20Ocultista" target="_blank" rel="noopener noreferrer" class="boton-compartir" title="Compartir en Facebook">f</a>
                        <a href="https://api.whatsapp.com/send?text=He%20encontrado%20el%20tomo%20'${encodeURIComponent(libro.titulo)}'%20en%20la%20Biblioteca%20Ocultista:%20${encodeURIComponent('https://magiacaotica.github.io/Biblioteca-Caotica/')}" target="_blank" rel="noopener noreferrer" class="boton-compartir" title="Compartir en WhatsApp">✆</a>
                    </div>
                </div>
            `;
            estanteria.appendChild(divLibro);
        });

        indiceLibrosMostrados = fin;
        estaCargando = false;
    }

    function copiarAlPortapapeles(texto) {
        navigator.clipboard.writeText(texto).then(() => {
            alert('¡Enlace copiado al portapapeles!');
        }, (err) => {
            console.error('Error al copiar el texto: ', err);
            alert('No se pudo copiar el enlace.');
        });
    }

    // Inicia o reinicia la vista de la biblioteca
    function iniciarVista() {
        indiceLibrosMostrados = 0;
        estanteria.innerHTML = '';
        totalLibrosEl.textContent = `${librosFiltradosActuales.length} tomos encontrados.`;
        
        // Ya no necesitamos el IntersectionObserver para esta solución
        mostrarLibros();
    }

    // Función para llenar el selector de categorías
    function popularCategorias(libros) {
        const categorias = new Set();
        libros.forEach(libro => {
            if (libro.categoria) {
                categorias.add(libro.categoria);
            }
        });

        const categoriasOrdenadas = Array.from(categorias).sort();
        categoriasOrdenadas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filtroCategoria.appendChild(option);
        });
    }

    // Función para llenar el selector de idiomas
    function popularIdiomas(libros) {
        const idiomas = new Set();
        libros.forEach(libro => {
            if (libro.idioma) {
                idiomas.add(libro.idioma);
            }
        });

        const idiomasOrdenados = Array.from(idiomas).sort();
        idiomasOrdenados.forEach(idioma => {
            const option = document.createElement('option');
            option.value = idioma;
            option.textContent = idioma;
            filtroIdioma.appendChild(option);
        });
    }

    // Función para filtrar y buscar
    function filtrarLibros() {
        const textoBusqueda = buscador.value.toLowerCase().trim();
        const categoriaSeleccionada = filtroCategoria.value;
        const idiomaSeleccionado = filtroIdioma.value;

        librosFiltradosActuales = todosLosLibros.filter(libro => {
            const coincideBusqueda = libro.titulo.toLowerCase().includes(textoBusqueda) || 
                                     libro.autor.toLowerCase().includes(textoBusqueda);
            
            const coincideCategoria = categoriaSeleccionada === 'todos' || libro.categoria === categoriaSeleccionada;
            const coincideIdioma = idiomaSeleccionado === 'todos' || libro.idioma === idiomaSeleccionado;
            return coincideBusqueda && coincideCategoria && coincideIdioma;
        });
        iniciarVista();
    }

    // Evento de scroll para el "scroll infinito"
    window.addEventListener('scroll', () => {
        // Condición para cargar más:
        // 1. No estar ya cargando.
        // 2. Haber más libros por mostrar.
        // 3. Estar cerca del final de la página (a 500px del final).
        if (!estaCargando && indiceLibrosMostrados < librosFiltradosActuales.length &&
            (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            mostrarLibros();
        }
    });

    // Añadir los event listeners para la interactividad
    buscador.addEventListener('keyup', filtrarLibros);
    filtroCategoria.addEventListener('change', filtrarLibros);
    filtroIdioma.addEventListener('change', filtrarLibros);
});