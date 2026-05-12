import json
import re
import os

def identificar_idioma(titulo):
    """
    Identifica si un título está en español o inglés basándose en heurísticas.
    Por defecto, asume inglés si no encuentra indicadores claros de español.
    """
    titulo_lower = f" {titulo.lower()} "

    # Palabras y terminaciones comunes en español que son raras en títulos en inglés.
    palabras_espanol = [
        # Artículos y preposiciones
        ' el ', ' la ', ' los ', ' las ', ' un ', ' una ', ' de ', ' del ', ' y ', ' en ', ' para ', ' por ',
        # Terminaciones comunes
        'ción', 'sión', 'logia', 'mente', 'dad', 'tad',
        # Palabras comunes
        'libro', 'secreto', 'misterio', 'magia', 'bruja', 'poder', 'amor', 'vida', 'muerte',
        'grandes', 'historia', 'mundo', 'hombre', 'nuevo', 'sagrado', 'oculto'
    ]

    # Marcadores explícitos
    if '(spanish)' in titulo_lower or '(español)' in titulo_lower:
        return 'Español'
    if '(port)' in titulo_lower or '(german)' in titulo_lower:
        return 'Otro'

    # Comprobar si alguna de las palabras clave en español está en el título
    if any(palabra in titulo_lower for palabra in palabras_espanol):
        return 'Español'

    # Si no se encuentran indicadores de español, se asume que es inglés.
    # Esta es una suposición basada en que muchos títulos técnicos o de origen están en inglés.
    return 'Inglés'

def procesar_biblioteca(archivo_js):
    """
    Lee el archivo de datos de la biblioteca, añade el idioma y lo reescribe.
    """
    try:
        with open(archivo_js, 'r', encoding='utf-8') as f:
            contenido_js = f.read()

        # Extraer el JSON del archivo JS usando una expresión regular
        json_match = re.search(r'=\s*(\[.*\]);', contenido_js, re.DOTALL)
        if not json_match:
            print(f"Error: No se pudo encontrar el array de datos en '{archivo_js}'.")
            return

        libros = json.loads(json_match.group(1))

        # Añadir el campo de idioma a cada libro
        for libro in libros:
            libro['idioma'] = identificar_idioma(libro['titulo'])

        # Convertir la lista actualizada a una cadena JSON formateada
        json_string_actualizado = json.dumps(libros, ensure_ascii=False, indent=4)

        # Escribir de nuevo en el archivo .js
        with open(archivo_js, 'w', encoding='utf-8') as f:
            f.write(f"const BIBLIOTECA_DATOS = {json_string_actualizado};")

        print(f"¡Éxito! Se ha actualizado '{archivo_js}' con la información del idioma para {len(libros)} libros.")

    except FileNotFoundError:
        print(f"Error: El archivo '{archivo_js}' no fue encontrado.")
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

if __name__ == '__main__':
    archivo_datos_js = 'biblioteca_datos.js'
    procesar_biblioteca(archivo_datos_js)