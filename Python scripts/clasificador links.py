import pandas as pd
import os
import re

def crear_excel_desde_txt(archivo_txt, archivo_excel):
    """
    Lee un archivo de texto, extrae nombres de archivo y enlaces de Mega,
    y crea un archivo de Excel con estos datos, incluyendo hipervínculos.

    Args:
        archivo_txt (str): Ruta al archivo de texto de entrada.
        archivo_excel (str): Ruta donde se guardará el archivo de Excel de salida.
    """
    datos = []
    
    # Expresión regular para capturar el nombre del archivo y el enlace
    # Busca 'Exported', luego el nombre del archivo hasta ':', y finalmente la URL https.
    regex = re.compile(r"Exported\s+/MagiaCaotica/(.*?\.pdf):\s+(https://mega\.nz/file/\S+)")

    try:
        with open(archivo_txt, 'r', encoding='utf-8') as f:
            for linea in f:
                # Ignorar líneas que no contienen 'Exported' y 'https://'
                if "Exported" not in linea or "https://" not in linea:
                    continue

                match = regex.search(linea)
                if match:
                    nombre_archivo = match.group(1)
                    link_mega = match.group(2).strip()
                    
                    # Crear el hipervínculo para Excel
                    hipervinculo = f'=HYPERLINK("{link_mega}", "{nombre_archivo}")'
                    
                    datos.append({
                        'Nombre del Archivo': nombre_archivo,
                        'Link de Mega': link_mega,
                        'Hipervínculo': hipervinculo
                    })

    except FileNotFoundError:
        print(f"Error: El archivo '{archivo_txt}' no fue encontrado.")
        return
    except Exception as e:
        print(f"Ocurrió un error al leer el archivo: {e}")
        return

    if not datos:
        print("No se encontraron datos válidos para procesar en el archivo.")
        return

    # Crear un DataFrame de pandas
    df = pd.DataFrame(datos)

    # Escribir el DataFrame a un archivo Excel
    try:
        # Usamos el motor 'xlsxwriter' que maneja bien los hipervínculos como fórmulas
        with pd.ExcelWriter(archivo_excel, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Libros')

            # Obtener el workbook y la worksheet para ajustar el ancho de las columnas
            workbook  = writer.book
            worksheet = writer.sheets['Libros']

            # Ajustar el ancho de las columnas para una mejor visualización
            worksheet.set_column('A:A', 50) # Nombre del Archivo
            worksheet.set_column('B:B', 70) # Link de Mega
            worksheet.set_column('C:C', 50) # Hipervínculo

        print(f"¡Éxito! Se ha creado el archivo '{archivo_excel}' con {len(datos)} registros.")

    except Exception as e:
        print(f"Ocurrió un error al escribir el archivo de Excel: {e}")


if __name__ == '__main__':
    # Ruta del archivo de texto de entrada
    archivo_entrada = r'd:\13. Proyectos Programacion\38. Bilbioteca ocultista\lista_nombres_links.txt'
    
    # Nombre del archivo de Excel de salida
    archivo_salida = 'biblioteca_ocultista.xlsx'
    
    crear_excel_desde_txt(archivo_entrada, archivo_salida)
