import json
import re
import os
import sys
import traceback
import time
import pandas as pd
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# --- INSTRUCCIONES ---
# 1. Asegúrate de tener las librerías necesarias:
#    pip install --upgrade google-generativeai pandas openpyxl
#    pip install google-generativeai pandas openpyxl
#
# 2. Coloca este script en la misma carpeta que tu archivo 'lista_nombres_links.txt'.
#
# 3. Ejecuta el script desde tu terminal:
#    python enriquecer_biblioteca.py
#
# NOTA: Este script reemplaza y mejora 'crear_datos_biblioteca.py' y 'generar_resumenes.py'.
# - Es "reanudable": si se detiene, puedes volver a ejecutarlo y continuará donde se quedó.
# - Guarda el progreso libro por libro en 'biblioteca_datos.js' y 'biblioteca_ocultista.xlsx'.
# - Muestra el costo de cada operación de IA para que tengas control total.

# --- CONFIGURACIÓN ---
API_KEY = 'AIzaSyC7gHSxsgQutVomFey4pWSDkFf0mJozURU'
genai.configure(api_key=API_KEY)

# Usamos el modelo más económico y rápido disponible.
# NOTA: El modelo se establece en 'gemini-1.5-flash'. Si sigues recibiendo errores 404,
# es CRUCIAL que actualices tu librería con: pip install --upgrade google-generativeai
# El nombre 'gemini-2.5-flash' no existe actualmente.
MODELO_IA = 'gemini-1.5-flash'

# Precios por millón de tokens para el modelo 'gemini-1.5-flash' (consulta la web de Google para precios actualizados)
# Precio de entrada (prompt): $0.35 por 1 millón de tokens
# Precio de salida (respuesta): $0.70 por 1 millón de tokens
PRECIO_INPUT_POR_TOKEN = 0.35 / 1_000_000
PRECIO_OUTPUT_POR_TOKEN = 0.70 / 1_000_000

ARCHIVO_TXT_ENTRADA = 'lista_nombres_links.txt'
ARCHIVO_JS_SALIDA = 'biblioteca_datos.js'
ARCHIVO_EXCEL_SALIDA = 'biblioteca_ocultista.xlsx'

# Configuración de seguridad para la IA (menos restrictiva)
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

model = genai.GenerativeModel(MODELO_IA, safety_settings=safety_settings)

def calcular_costo(response):
    """Calcula el costo de una llamada a la API basándose en los tokens de entrada y salida."""
    try:
        input_tokens = response.usage_metadata.prompt_token_count
        output_tokens = response.usage_metadata.candidates_token_count
        costo = (input_tokens * PRECIO_INPUT_POR_TOKEN) + (output_tokens * PRECIO_OUTPUT_POR_TOKEN)
        return costo
    except (AttributeError, Exception):
        return 0.0

def corregir_metadatos_libro(nombre_archivo):
    """Usa IA para extraer y corregir el autor y el título desde un nombre de archivo."""
    prompt = (
        f"Analiza el siguiente nombre de archivo: '{nombre_archivo}'. "
        "Extrae el autor y el título del libro. Si el autor es 'Anónimo' o no está claro, usa 'Autor Desconocido'. "
        "Limpia el título eliminando extensiones de archivo, guiones bajos y texto basura. "
        "Devuelve la respuesta únicamente en formato JSON con las claves 'autor' y 'titulo'. Ejemplo: "
        '{"autor": "Eliphas Levi", "titulo": "Dogma y Ritual de la Alta Magia"}'
    )
    try:
        response = model.generate_content(prompt)
        costo = calcular_costo(response)
        
        # Limpiar la respuesta para que sea un JSON válido
        json_text = response.text.strip().replace("```json", "").replace("```", "")
        datos = json.loads(json_text)
        
        print(f"    - Corrección de metadatos: OK (Costo: ${costo:.8f})")
        return datos['autor'], datos['titulo'], costo
    except Exception:
        e = traceback.format_exc()
        print(f"    - ERROR en corrección de metadatos: {e}. Usando valores por defecto.")
        # Heurística simple como respaldo
        titulo_limpio, _ = os.path.splitext(nombre_archivo)
        titulo_limpio = titulo_limpio.replace('_', ' ').strip()
        if ' - ' in titulo_limpio:
            partes = titulo_limpio.split(' - ', 1)
            return partes[0].strip(), partes[1].strip(), 0.0
        return "Autor Desconocido", titulo_limpio, 0.0

def generar_resumen_libro(titulo, autor, idioma):
    """Usa IA para generar un resumen conciso para un libro."""
    prompt_base = f"Genera una descripción muy breve (máximo 280 caracteres, estilo tweet) para el libro esotérico u ocultista titulado '{titulo}' del autor '{autor}'. La descripción debe ser concisa, atractiva y no incluir hashtags ni comillas al inicio o final."

    if idioma == 'Español':
        prompt_idioma = " El resumen debe estar en español."
        if autor.lower() in ['autor desconocido', 'anónimo']:
            prompt_tono = " Dale un sabor de información oculta y secreta, como si fuera un tesoro solo para el lector."
        else:
            prompt_tono = ""
    else: # Inglés u otro
        prompt_idioma = " The summary must be in English."
        if autor.lower() in ['unknown author', 'anonymous']:
            prompt_tono = " Give it a flavor of hidden and secret information, as if it were a treasure only for the reader."
        else:
            prompt_tono = ""

    prompt = prompt_base + prompt_idioma + prompt_tono

    try:
        response = model.generate_content(prompt)
        costo = calcular_costo(response)
        resumen = response.text.strip()
        print(f"    - Generación de resumen: OK (Costo: ${costo:.8f})")
        return resumen, costo
    except Exception:
        e = traceback.format_exc()
        print(f"    - ERROR al generar resumen: {e}")
        if idioma == 'Español':
            return "No hay resumen disponible.", 0.0
        return "No summary available.", 0.0

def asignar_categoria(titulo):
    titulo_lower = titulo.lower()
    if any(k in titulo_lower for k in ['cábala', 'cabala', 'qabalah', 'kabbalah', 'zohar', 'sepher', 'sefir']): return 'Cábala' # Corrected typo
    if any(k in titulo_lower for k in ['magia del caos', 'chaos magic', 'liber null', 'kaos']): return 'Magia del Caos' # Corrected typo
    if any(k in titulo_lower for k in ['hermetismo', 'hermeticum', 'hermes', 'trismegisto']): return 'Hermetismo' # Corrected typo
    if any(k in titulo_lower for k in ['alquimia', 'alchemy']): return 'Alquimia' # Corrected typo
    if any(k in titulo_lower for k in ['gnosis', 'gnosticismo']): return 'Gnosticismo' # Corrected typo
    if any(k in titulo_lower for k in ['wicca', 'bruja', 'witchcraft', 'gardner']): return 'Wicca y Brujería' # Corrected typo
    if any(k in titulo_lower for k in ['satanismo', 'lucifer', 'demonio', 'infernal', 'lavey']): return 'Satanismo y Luciferismo' # Corrected typo
    if any(k in titulo_lower for k in ['rosacruz', 'rosicrucian']): return 'Rosacrucismo' # Corrected typo
    if any(k in titulo_lower for k in ['templarios', 'masoneria', 'masonic']): return 'Órdenes Secretas' # Corrected typo
    if any(k in titulo_lower for k in ['runas', 'rune', 'nórdic']): return 'Runas y Tradición Nórdica' # Corrected typo
    if any(k in titulo_lower for k in ['astrologia', 'astrology']): return 'Astrología' # Corrected typo
    if any(k in titulo_lower for k in ['tarot']): return 'Tarot' # Corrected typo
    if any(k in titulo_lower for k in ['yoga', 'tantra', 'hindu', 'budismo']): return 'Filosofía Oriental' # Corrected typo
    if any(k in titulo_lower for k in ['egipto', 'egyptian']): return 'Misterios Egipcios' # Corrected typo
    return 'Ocultismo General'

def identificar_idioma(titulo):
    titulo_lower = f" {titulo.lower()} "
    palabras_espanol = [' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' de ', ' del ', ' y ', ' en ', ' para ', ' por ', 'ción', 'sión', 'libro', 'secreto', 'misterio', 'magia', 'bruja']
    if '(spanish)' in titulo_lower or '(español)' in titulo_lower: return 'Español'
    if '(port)' in titulo_lower or '(german)' in titulo_lower: return 'Otro'
    if any(palabra in titulo_lower for palabra in palabras_espanol): return 'Español'
    return 'Inglés'

def cargar_datos_existentes():
    """Carga los datos de los archivos de salida si existen para evitar duplicados."""
    libros_existentes = {}
    if os.path.exists(ARCHIVO_JS_SALIDA):
        try:
            with open(ARCHIVO_JS_SALIDA, 'r', encoding='utf-8') as f:
                contenido_js = f.read()
            json_match = re.search(r'=\s*(\[.*\]);', contenido_js, re.DOTALL)
            if json_match:
                libros_js = json.loads(json_match.group(1))
                for libro in libros_js:
                    libros_existentes[libro['link']] = libro
        except Exception as e:
            print(f"Advertencia: No se pudo leer {ARCHIVO_JS_SALIDA}. Se creará uno nuevo. Error: {e}")
    return libros_existentes

def guardar_progreso(libros_dict):
    """Guarda la lista completa de libros en JS y Excel."""
    lista_libros = sorted(list(libros_dict.values()), key=lambda x: (x.get('autor', '').lower(), x.get('titulo', '').lower()))
    
    # Guardar en JS
    json_string = json.dumps(lista_libros, ensure_ascii=False, indent=4)
    with open(ARCHIVO_JS_SALIDA, 'w', encoding='utf-8') as f:
        f.write(f"const BIBLIOTECA_DATOS = {json_string};")

    # Guardar en Excel
    df = pd.DataFrame(lista_libros)
    # Crear columna de hipervínculo para Excel
    df['Hipervínculo'] = df.apply(lambda row: f'=HYPERLINK("{row["link"]}", "{row["titulo"]}")', axis=1)
    
    columnas_ordenadas = [
        'Hipervínculo', 'autor', 'titulo', 'resumen', 'categoria', 'idioma', 
        'link', 'costo_correccion', 'costo_resumen', 'costo_total'
    ]
    df = df[columnas_ordenadas]

    with pd.ExcelWriter(ARCHIVO_EXCEL_SALIDA, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Biblioteca Arcana')
        worksheet = writer.sheets['Biblioteca Arcana']
        worksheet.set_column('A:A', 40) # Hipervínculo
        worksheet.set_column('B:B', 25) # autor
        worksheet.set_column('C:C', 40) # titulo
        worksheet.set_column('D:D', 50) # resumen
        worksheet.set_column('E:H', 15) # Otras columnas

def mostrar_barra_progreso(iteracion, total, prefijo='', sufijo='', longitud=50, relleno='█'):
    """
    Muestra una barra de progreso en la terminal.
    """
    porcentaje = ("{0:.1f}").format(100 * (iteracion / float(total)))
    longitud_relleno = int(longitud * iteracion // total)
    barra = relleno * longitud_relleno + '-' * (longitud - longitud_relleno)
    # Usamos sys.stdout.write y \r para imprimir en la misma línea
    sys.stdout.write(f'\r{prefijo} |{barra}| {porcentaje}% {sufijo}')
    sys.stdout.flush()
    if iteracion == total:
        sys.stdout.write('\n')


def procesar_biblioteca(modo_ejecucion):
    """
    Función principal que orquesta la lectura, enriquecimiento y guardado de datos.
    Args:
        modo_ejecucion (str): 'reanudar' para continuar, 'completo' para empezar de cero.
    """
    if modo_ejecucion == 'completo':
        print("\nMODO: Escaneo completo. Se procesarán todos los libros desde cero.")
        print(f"ADVERTENCIA: Los archivos '{ARCHIVO_JS_SALIDA}' y '{ARCHIVO_EXCEL_SALIDA}' serán sobreescritos.")
        libros_en_memoria = {}
    else: # modo_ejecucion == 'reanudar'
        print("\nMODO: Reanudación. Se buscarán libros sin resumen para procesar.")
        libros_en_memoria = cargar_datos_existentes()
        print(f"Se han cargado {len(libros_en_memoria)} libros existentes. El proceso continuará desde donde se quedó.")

    try:
        with open(ARCHIVO_TXT_ENTRADA, 'r', encoding='utf-8', errors='ignore') as f:
            lineas = f.readlines()
    except FileNotFoundError:
        print(f"ERROR: El archivo de entrada '{ARCHIVO_TXT_ENTRADA}' no fue encontrado.")
        return

    regex = re.compile(r"Exported\s+/MagiaCaotica/(.*?):\s+(https://mega\.nz/file/\S+)", re.IGNORECASE)

    # --- Lógica para la barra de progreso de "libros a procesar" ---
    libros_a_procesar = []
    for linea in lineas:
        match = regex.search(linea)
        if match:
            link_mega = match.group(2).strip()
            if not (link_mega in libros_en_memoria and libros_en_memoria[link_mega].get('resumen')):
                libros_a_procesar.append(linea)
    
    total_a_procesar = len(libros_a_procesar)
    procesados_count = 0
    print(f"Se encontraron {total_a_procesar} libros nuevos o sin resumen para procesar.")
    # ----------------------------------------------------------------

    for i, linea in enumerate(lineas):
        # Barra de progreso general (recorrido del archivo)
        mostrar_barra_progreso(i + 1, len(lineas), prefijo='Progreso General:', sufijo='Completado', longitud=40)

        match = regex.search(linea)
        if not match:
            continue

        # --- LÓGICA DE REANUDACIÓN ---
        # Si el libro ya tiene resumen, lo saltamos.
        link_mega = match.group(2).strip()
        if link_mega in libros_en_memoria and libros_en_memoria[link_mega].get('resumen'):
            continue

        nombre_archivo_raw = match.group(1).strip()
        procesados_count += 1
        
        # Limpiamos la línea de la barra de progreso para imprimir los detalles del libro
        sys.stdout.write('\r' + ' ' * 80 + '\r') 

        print(f"\n({i+1}/{len(lineas)}) Procesando: {nombre_archivo_raw}")
        
        # 1. Corregir metadatos
        autor, titulo, costo_correccion = corregir_metadatos_libro(nombre_archivo_raw)
        
        # 2. Asignar idioma
        idioma = identificar_idioma(titulo)
        
        # 3. Generar resumen (ahora depende del idioma)
        resumen, costo_resumen = generar_resumen_libro(titulo, autor, idioma)
        categoria = asignar_categoria(titulo)

        # 4. Consolidar datos
        costo_total = costo_correccion + costo_resumen
        libros_en_memoria[link_mega] = {
            'autor': autor,
            'titulo': titulo,
            'resumen': resumen,
            'categoria': categoria,
            'idioma': idioma,
            'link': link_mega,
            'costo_correccion': round(costo_correccion, 8),
            'costo_resumen': round(costo_resumen, 8),
            'costo_total': round(costo_total, 8)
        }
        
        print(f"    -> Costo total para este libro: ${costo_total:.8f}")

        # 5. Guardar progreso inmediatamente
        guardar_progreso(libros_en_memoria)
        print(f"    -> Progreso guardado en '{ARCHIVO_JS_SALIDA}' y '{ARCHIVO_EXCEL_SALIDA}'.")

        # Barra de progreso de libros que realmente se procesan
        mostrar_barra_progreso(procesados_count, total_a_procesar, prefijo='Progreso Libros Nuevos:', sufijo=f'({procesados_count}/{total_a_procesar})', longitud=40)

        # Pausa para no saturar la API
        time.sleep(1.5)

    print("\n\n--- ¡PROCESO DE ENRIQUECIMIENTO COMPLETADO! ---")
    print(f"Total de libros en la biblioteca: {len(libros_en_memoria)}")

if __name__ == '__main__':
    print("--- Asistente de Enriquecimiento de la Biblioteca Arcana ---")
    print("Por favor, elige un modo de ejecución:")
    print("1. Reanudar: Solo procesar libros que no tengan resumen (más rápido y económico).")
    print("2. Reescribir todo: Procesar todos los libros desde el principio (ignora datos existentes).")

    modo = ''
    while modo.strip() not in ['1', '2']:
        modo = input("Introduce tu elección (1 o 2): ")
        if modo == '1':
            print("Has elegido 'Reanudar'.")
            procesar_biblioteca(modo_ejecucion='reanudar')
        elif modo == '2':
            confirmacion = input("Esto sobreescribirá tus archivos de datos. ¿Estás seguro? (s/n): ").lower()
            if confirmacion == 's':
                print("Has elegido 'Reescribir todo'.")
                procesar_biblioteca(modo_ejecucion='completo')
            else:
                print("Operación cancelada.")
                modo = '' # Vuelve a pedir la opción
        else:
            print("Elección no válida. Por favor, introduce 1 o 2.")