import re
import json
import os

def asignar_categoria(titulo):
    """
    Asigna una categoría basada en palabras clave en el título.
    Esta es una función simple que puedes expandir con tu conocimiento.
    """
    titulo_lower = titulo.lower()
    if any(k in titulo_lower for k in ['cábala', 'cabala', 'qabalah', 'kabbalah', 'zohar', 'sepher', 'sefir']):
        return 'Cábala'
    if any(k in titulo_lower for k in ['magia del caos', 'chaos magic', 'liber null', 'kaos']):
        return 'Magia del Caos'
    if any(k in titulo_lower for k in ['hermetismo', 'hermeticum', 'hermes', 'trismegisto']):
        return 'Hermetismo'
    if any(k in titulo_lower for k in ['alquimia', 'alchemy']):
        return 'Alquimia'
    if any(k in titulo_lower for k in ['gnosis', 'gnosticismo']):
        return 'Gnosticismo'
    if any(k in titulo_lower for k in ['wicca', 'bruja', 'witchcraft', 'gardner']):
        return 'Wicca y Brujería'
    if any(k in titulo_lower for k in ['satanismo', 'lucifer', 'demonio', 'infernal', 'lavey']):
        return 'Satanismo y Luciferismo'
    if any(k in titulo_lower for k in ['rosacruz', 'rosicrucian']):
        return 'Rosacrucismo'
    if any(k in titulo_lower for k in ['templarios', 'masoneria', 'masonic']):
        return 'Órdenes Secretas'
    if any(k in titulo_lower for k in ['runas', 'rune', 'nórdic', 'teutonic']):
        return 'Runas y Tradición Nórdica'
    if any(k in titulo_lower for k in ['astrologia', 'astrology']):
        return 'Astrología'
    if any(k in titulo_lower for k in ['tarot']):
        return 'Tarot'
    if any(k in titulo_lower for k in ['yoga', 'tantra', 'hindu', 'budismo']):
        return 'Filosofía Oriental'
    if any(k in titulo_lower for k in ['egipto', 'egyptian']):
        return 'Misterios Egipcios'
    return 'Ocultismo General'

def procesar_lista_links(archivo_txt, archivo_js_salida):
    """
    Lee el archivo de texto, extrae la información, la enriquece
    y la guarda en un archivo JSON para la web.
    """
    libros = []
    links_procesados = set() # Usaremos un conjunto para llevar un registro de los links y evitar duplicados
    
    # Regex mejorada:
    # 1. Busca "Exported"
    # 2. Ignora "/MagiaCaotica/"
    # 3. Captura el nombre del archivo (cualquier caracter hasta los dos puntos)
    # 4. Captura el link de mega.
    # re.IGNORECASE ya no es necesario si no filtramos por extensión.
    regex = re.compile(r"Exported\s+/MagiaCaotica/(.*?):\s+(https://mega\.nz/file/\S+)", re.IGNORECASE)

    try:
        with open(archivo_txt, 'r', encoding='utf-8', errors='ignore') as f:
            for linea in f:
                # Ignorar líneas de error o que no sean de exportación
                if "Exported" not in linea or "https://" not in linea:
                    continue

                match = regex.search(linea)
                if match:
                    nombre_completo = match.group(1).strip()
                    link_mega = match.group(2).strip()

                    # --- Lógica para eliminar duplicados ---
                    if link_mega in links_procesados:
                        continue # Si el link ya fue procesado, saltamos esta línea
                    links_procesados.add(link_mega)

                    # Eliminar la extensión del archivo para tener un título limpio
                    titulo_limpio, _ = os.path.splitext(nombre_completo)
                    
                    # Reemplazar guiones bajos y normalizar espacios para un título más legible
                    titulo_limpio = titulo_limpio.replace('_', ' ').replace('  ', ' ').strip()
                    
                    # Intentar separar autor y título
                    autor = "Anónimo"
                    titulo = titulo_limpio
                    
                    # Heurística simple para encontrar autor (si hay un guión)
                    if ' - ' in titulo_limpio:
                        partes = titulo_limpio.split(' - ', 1)
                        autor = partes[0].strip()
                        titulo = partes[1].strip()

                    categoria = asignar_categoria(titulo)

                    libros.append({
                        'autor': autor,
                        'titulo': titulo,
                        'categoria': categoria,
                        'link': link_mega
                    })

    except FileNotFoundError:
        print(f"Error: El archivo '{archivo_txt}' no fue encontrado.")
        return
    except Exception as e:
        print(f"Ocurrió un error al leer el archivo: {e}")
        return

    if not libros:
        print("No se encontraron libros válidos para procesar.")
        return

    # Ordenar la lista de libros alfabéticamente por autor y luego por título
    libros_ordenados = sorted(libros, key=lambda x: (x['autor'].lower(), x['titulo'].lower()))
    print(f"\nSe procesaron {len(libros_ordenados)} libros únicos.")

    try:
        # Convertir la lista de libros a una cadena JSON
        json_string = json.dumps(libros_ordenados, ensure_ascii=False, indent=4)
        # Escribir en un archivo .js, asignando los datos a una variable global
        with open(archivo_js_salida, 'w', encoding='utf-8') as f:
            f.write(f"const BIBLIOTECA_DATOS = {json_string};")
        print(f"¡Éxito! Se ha creado '{archivo_js_salida}' con {len(libros_ordenados)} libros.")
    except Exception as e:
        print(f"Ocurrió un error al escribir el archivo JS: {e}")

if __name__ == '__main__':
    # Asegúrate de que la ruta al archivo de texto sea correcta
    archivo_entrada = r'd:\13. Proyectos Programacion\38. Bilbioteca ocultista\lista_nombres_links.txt'
    archivo_salida_js = 'biblioteca_datos.js'
    
    procesar_lista_links(archivo_entrada, archivo_salida_js)
    print(f"\nProceso completado. El archivo '{archivo_salida_js}' está listo para la web.")