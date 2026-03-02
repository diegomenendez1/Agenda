import subprocess
import os
import sys

def main():
    print("Iniciando la aplicación en el puerto 3000...")
    try:
        # Usamos cmd /c npm run dev como recomienda el SOP para evitar problemas de políticas en Windows
        process = subprocess.Popen(["cmd", "/c", "npm run dev"], 
                                   stdout=subprocess.PIPE, 
                                   stderr=subprocess.STDOUT, 
                                   text=True, 
                                   bufsize=1)
        
        # Monitoreamos la salida para confirmar que el servidor inició
        for line in process.stdout:
            print(line, end="")
            if "Local:" in line or "http://localhost:3000" in line:
                print("\nServidor detectado correctamente.")
                break
            if "error" in line.lower() or "failed" in line.lower():
                print("\nSe detectó un posible error al iniciar.")
                break
                
    except Exception as e:
        print(f"Error al ejecutar el script: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
