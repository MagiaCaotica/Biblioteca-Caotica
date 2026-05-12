import json
import re
import os
from nameparser import HumanName

# --- INSTRUCCIONES ---
# 1. Instala la librería `nameparser` si no la tienes:
#    pip install nameparser
#
# 2. Coloca este script en la misma carpeta que tu archivo 'biblioteca_datos.js'.
#
# 3. Ejecuta el script desde tu terminal:
#    python estandarizar_autores.py
#
# 4. El script modificará 'biblioteca_datos.js' directamente, estandarizando
#    los nombres de los autores al formato "Apellido, Nombre".
#
# NOTA: Es una buena práctica hacer una copia de seguridad de 'biblioteca_datos.js'
# antes de ejecutar este script por primera vez.

ARCHIVO_JS = 'biblioteca_datos.js'

# Lista de nombres que no deben ser procesados y deben mantenerse como están.
# Útil para seudónimos, nombres de órdenes o casos especiales.
NOMBRES_A_IGNORAR = ['Papus', 'Aradia', 'Wotan', 'Aos']

def estandarizar_autor(nombre_autor):
    """
    Estandariza un nombre de autor al formato "Apellido, Nombre".
    Utiliza nameparser para identificar de forma robusta las partes del nombre
    y reconstruirlo en el orden correcto, sin importar el formato de entrada.
    Corrige casos como "Nombre, Apellido" a "Apellido, Nombre".
    """
    nombre_lower = nombre_autor.lower().strip()

    # 1. Estandarizar autores desconocidos o anónimos
    autores_desconocidos = ['autor desconocido', 'anónimo', 'desconocido']
    if nombre_lower in autores_desconocidos:
        return "Autor Desconocido"

    # 2. Ignorar nombres específicos que no deben ser alterados (seudónimos, etc.)
    if nombre_autor.title() in NOMBRES_A_IGNORAR:
        return nombre_autor.title()

    # 3. Lógica para corregir el formato "Nombre, Apellido"
    nombre_a_procesar = nombre_autor
    if ',' in nombre_autor:
        partes = [p.strip() for p in nombre_autor.split(',')]
        if len(partes) == 2:
            # Analizamos la primera parte para ver si es un nombre de pila.
            # HumanName("Aleister") -> first='Aleister', last=''
            # HumanName("Crowley")  -> first='Crowley', last=''
            # HumanName("De La Cierva") -> last='De La Cierva'
            # Si la primera parte es reconocida como un nombre de pila (y no como un apellido),
            # es muy probable que el formato esté invertido.
            analisis_previo = HumanName(partes[0])
            if analisis_previo.first and not analisis_previo.last:
                # Formato incorrecto detectado: "Nombre, Apellido". Lo invertimos.
                print(f"    * Corrigiendo formato invertido: '{nombre_autor}'")
                nombre_a_procesar = f"{partes[1]} {partes[0]}"

    # 4. Analizar el nombre (ya corregido si era necesario) con nameparser.
    autor_parseado = HumanName(nombre_a_procesar)

    # 5. Reconstruir el nombre SIEMPRE en el formato "Apellido, Nombre".
    # nameparser maneja apellidos compuestos y partículas (ej. 'de la Cierva')
    # Esta lógica asegura que la parte identificada como 'last' vaya primero.
    apellido = autor_parseado.last
    nombre = autor_parseado.first
    segundo_nombre = autor_parseado.middle

    if apellido and nombre:
        nombre_completo = ' '.join(filter(None, [nombre, segundo_nombre]))
        return f"{apellido.title()}, {nombre_completo.title()}"
    else:
        # Si no puede encontrar un apellido (ej. un solo nombre como 'Platón' o 'Anónimo'),
        # devolvemos el nombre original capitalizado.
        return nombre_autor.title()

def procesar_biblioteca_autores():
    """
    Lee el archivo JS, estandariza los nombres de los autores y reescribe el archivo.
    """
    if not os.path.exists(ARCHIVO_JS):
        print(f"Error: El archivo '{ARCHIVO_JS}' no se encuentra en esta carpeta.")
        return

    try:
        with open(ARCHIVO_JS, 'r', encoding='utf-8') as f:
            contenido_js = f.read()

        # Extraer el JSON del archivo JS usando una expresión regular
        json_match = re.search(r'=\s*(\[.*\]);', contenido_js, re.DOTALL)
        if not json_match:
            print(f"Error: No se pudo encontrar el array de datos en '{ARCHIVO_JS}'.")
            return

        libros = json.loads(json_match.group(1))
        autores_modificados = 0

        print(f"Iniciando proceso de estandarización para {len(libros)} libros...")

        for libro in libros:
            autor_original = libro.get('autor', 'Autor Desconocido')
            autor_estandarizado = estandarizar_autor(autor_original)
            if autor_original != autor_estandarizado:
                print(f"  -> Estandarizando '{autor_original}' a '{autor_estandarizado}'")
                libro['autor'] = autor_estandarizado
                autores_modificados += 1

        # Ordenar la lista de nuevo por el autor estandarizado
        libros_ordenados = sorted(libros, key=lambda x: (x.get('autor', '').lower(), x.get('titulo', '').lower()))

        json_string_actualizado = json.dumps(libros_ordenados, ensure_ascii=False, indent=4)
        with open(ARCHIVO_JS, 'w', encoding='utf-8') as f:
            f.write(f"const BIBLIOTECA_DATOS = {json_string_actualizado};")

        print(f"\n¡Proceso completado! Se modificaron {autores_modificados} nombres de autores en '{ARCHIVO_JS}'.")

    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

if __name__ == '__main__':
    procesar_biblioteca_autores()