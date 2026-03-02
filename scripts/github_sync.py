import subprocess
import sys

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, text=True, capture_output=True)
        print(f"Comando ejecutado: {command}")
        print(result.stdout)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error al ejecutar: {command}")
        print(f"Mensaje de error: {e.stderr}")
        return False, e.stderr

def sync_github(commit_message):
    print("Iniciando sincronización con GitHub...")
    
    # 1. git add .
    success, output = run_command("git add .")
    if not success:
        return False, f"Error en git add: {output}"
    
    # 2. git commit
    success, output = run_command(f'git commit -m "{commit_message}"')
    if not success:
        if "nothing to commit" in output:
            print("No hay cambios para confirmar.")
        else:
            return False, f"Error en git commit: {output}"
    
    # 3. git push
    success, output = run_command("git push origin main")
    if not success:
        return False, f"Error en git push: {output}"
    
    print("Sincronización completada con éxito.")
    return True, "Sincronización exitosa"

if __name__ == "__main__":
    message = "feat: Sincronización de cambios locales, directivas y scripts"
    if len(sys.argv) > 1:
        message = sys.argv[1]
    
    success, result = sync_github(message)
    if not success:
        print(f"\nFALLO EN LA SINCRONIZACIÓN: {result}")
        sys.exit(1)
    else:
        sys.exit(0)
