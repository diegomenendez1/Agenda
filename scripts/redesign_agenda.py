import os
import sys

def main():
    print("Leyendo directiva para Redesign Agenda...")
    directive_path = "directivas/redesign_agenda_SOP.md"
    
    if not os.path.exists(directive_path):
        print(f"Advertencia: No se encontró la directiva en {directive_path}")
    
    print("Iniciando validación de prerequisitos...")
    
    # Check for inputs
    if not os.path.exists("src"):
         print("Error: No se encontró la carpeta 'src'. Asegúrate de estar en la raíz del proyecto.")
         sys.exit(1)

    print("Prerequisitos validados.")
    print("Por favor, sigue los pasos manuales descritos en la directiva para la integración con Stitch y el rediseño.")
    print(f"Consulta: {os.path.abspath(directive_path)}")

if __name__ == "__main__":
    main()
