import json
import re
import os
import time
import google.generativeai as genai

# --- INSTRUCCIONES ---
# 1. Instala la librería de Google AI:
#    pip install google-generativeai
#
# 2. Coloca este script en la misma carpeta que tu archivo 'biblioteca_datos.js'.
#
# 3. Ejecuta el script desde tu terminal:
#    python generar_resumenes.py
#
# NOTA: El script ha sido diseñado para ser seguro y económico.
# - Solo procesará libros que NO tengan ya un campo 'resumen'.
# - Si lo ejecutas de nuevo, no gastará créditos en libros ya procesados.
# - Hay una pausa entre cada llamada a la API para evitar errores de cuota.

# --- CONFIGURACIÓN ---
# Como solicitaste, la clave de la API está directamente en el código.
API_KEY = 'AIzaSyC7gHSxsgQutVomFey4pWSDkFf0mJozURU'

# Configuramos el cliente de la API de Gemini
genai.configure(api_key=API_KEY)

# Seleccionamos el modelo 'flash', que es el más rápido y económico, ideal para esta tarea.
model = genai.GenerativeModel('gemini-2.5-flash')

ARCHIVO_JS = 'biblioteca_datos.js'

def generar_resumen(titulo, autor):
    """
    Genera un resumen para un libro usando la API de Gemini.
    """
    # Este es el "prompt" que le damos a la IA. Está optimizado para ser claro y obtener
    # una respuesta corta y en español, como un tweet.
    prompt = (
        f"Genera una descripción muy breve (máximo 280 caracteres, estilo tweet) para el libro esotérico u ocultista "
        f"titulado '{titulo}' del autor '{autor}'. La descripción debe ser concisa, atractiva y en español. "
        "No incluyas hashtags."
    )
    
    try:
        # Hacemos la llamada a la API
        response = model.generate_content(prompt)
        # Limpiamos la respuesta para asegurarnos de que no tenga espacios extra
        resumen = response.text.strip()
        print(f"  -> Resumen generado para '{titulo}': {resumen}")
        return resumen
    except Exception as e:
        # Si algo sale mal (ej. error de conexión, problema con la API), lo notificamos.
        print(f"  -> ERROR al generar resumen para '{titulo}': {e}")
        return "No hay resumen disponible en este momento."

def procesar_biblioteca():
    """
    Lee el archivo JS, añade los resúmenes faltantes y lo reescribe.
    """
    if not os.path.exists(ARCHIVO_JS):
        print(f"Error: El archivo '{ARCHIVO_JS}' no se encuentra en esta carpeta.")
        return

    with open(ARCHIVO_JS, 'r', encoding='utf-8') as f:
        contenido_js = f.read()

    # Usamos una expresión regular para extraer el array de libros del archivo JS
    json_match = re.search(r'=\s*(\[.*\]);', contenido_js, re.DOTALL)
    if not json_match:
        print(f"Error: No se pudo encontrar el array de datos en '{ARCHIVO_JS}'.")
        return

    libros = json.loads(json_match.group(1))
    libros_actualizados = 0

    print(f"Iniciando proceso para {len(libros)} libros. Se generarán resúmenes solo para los que falten.")

    for libro in libros:
        # ¡IMPORTANTE! Esta condición ahorra costos al no procesar libros que ya tienen resumen.
        if 'resumen' not in libro or not libro['resumen']:
            libro['resumen'] = generar_resumen(libro['titulo'], libro['autor'])
            libros_actualizados += 1
            # Pausa de 1 segundo para no saturar la API (política de buen uso y prevención de errores)
            time.sleep(1)
        else:
            # Si ya tiene resumen, simplemente lo informamos y continuamos.
            print(f"  -> Saltando '{libro['titulo']}', ya tiene resumen.")

    if libros_actualizados > 0:
        # Convertimos la lista de Python de nuevo a una cadena con formato JSON
        json_string_actualizado = json.dumps(libros, ensure_ascii=False, indent=4)
        
        # Reescribimos el archivo .js con los datos actualizados
        with open(ARCHIVO_JS, 'w', encoding='utf-8') as f:
            f.write(f"const BIBLIOTECA_DATOS = {json_string_actualizado};")
        print(f"\n¡Proceso completado! Se actualizaron {libros_actualizados} libros en '{ARCHIVO_JS}'.")
    else:
        print("\nNo se necesitaron actualizaciones. Todos los libros ya tenían un resumen.")

if __name__ == '__main__':
    procesar_biblioteca()