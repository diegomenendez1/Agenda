import os
import subprocess
import sys

def main():
    print("Leyendo directiva para Environment Initialization...")
    package_json_path = "package.json"
    
    if not os.path.exists(package_json_path):
        print(f"Error: {package_json_path} no encontrado.")
        sys.exit(1)
        
    print("Ejecutando npm install...")
    try:
        # Using shell=True for Windows compatibility as per directive learning
        subprocess.check_call("npm install", shell=True)
        print("Dependencias instaladas correctamente.")
    except subprocess.CalledProcessError as e:
        print(f"Error al ejecutar npm install: {e}")
        print("Error detectado. Reparando script y actualizando la memoria de la Directiva.")
        sys.exit(1)

if __name__ == "__main__":
    main()
