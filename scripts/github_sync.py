import subprocess
import sys
import os

def run_git_command(command):
    """Ejecuta un comando de git y devuelve el resultado."""
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            shell=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando {' '.join(command)}: {e.stderr}")
        sys.exit(1)

def sync_with_github(commit_message):
    """Sincroniza los cambios locales con GitHub."""
    print(f"Iniciando sincronización con GitHub: {commit_message}")
    
    # 1. Verificar estado
    status = run_git_command(["git", "status", "--short"])
    if not status:
        print("No hay cambios para sincronizar.")
        return

    # 2. Agregar cambios
    print("Agregando cambios...")
    run_git_command(["git", "add", "."])

    # 3. Commit
    print(f"Realizando commit: {commit_message}")
    run_git_command(["git", "commit", "-m", f'"{commit_message}"'])

    # 4. Push
    print("Enviando cambios a origin main...")
    run_git_command(["git", "push", "origin", "main"])
    
    print("Sincronización completada con éxito.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python github_sync.py 'mensaje de commit'")
        sys.exit(1)
    
    message = sys.argv[1]
    sync_with_github(message)
