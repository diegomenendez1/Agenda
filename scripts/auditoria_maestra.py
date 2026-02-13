import subprocess
import sys
import json
import os
from datetime import datetime

# Configuración
TMP_DIR = ".tmp"
REPORT_JSON = os.path.join(TMP_DIR, "reporte_auditoria_final.json")
REPORT_MD = os.path.join(TMP_DIR, "reporte_auditoria_final.md")

if not os.path.exists(TMP_DIR):
    os.makedirs(TMP_DIR)

audit_results = {
    "timestamp": datetime.now().isoformat(),
    "steps": []
}

def run_step(name, command, critical=True):
    """Ejecuta un paso de auditoría y registra el resultado."""
    print(f"\n--- Ejecutando: {name} ---")
    start_time = datetime.now()
    try:
        # Ejecutar comando
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        duration = (datetime.now() - start_time).total_seconds()
        
        success = result.returncode == 0
        output = result.stdout + "\n" + result.stderr
        
        step_result = {
            "name": name,
            "success": success,
            "duration": duration,
            "command": command,
            "output": output[:2000] # Truncar salida para el JSON
        }
        
        audit_results["steps"].append(step_result)
        
        if success:
            print(f"✅ {name}: PASSED ({duration:.2f}s)")
        else:
            print(f"❌ {name}: FAILED ({duration:.2f}s)")
            print(f"Output:\n{output[:500]}...") # Mostrar error
            
            if critical:
                print("⛔ Error crítico detectado. Abortando auditoría.")
                save_report()
                sys.exit(1)
                
        return success

    except Exception as e:
        print(f"❌ {name}: ERROR ({str(e)})")
        audit_results["steps"].append({
            "name": name,
            "success": False,
            "error": str(e)
        })
        if critical:
            save_report()
            sys.exit(1)
        return False

def save_report():
    """Guarda el reporte en JSON y Markdown."""
    # Guardar JSON
    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)
        
    # Generar Markdown
    md_content = f"# Reporte de Auditoría Final MVP\n\n"
    md_content += f"**Fecha:** {audit_results['timestamp']}\n\n"
    md_content += "| Paso | Estado | Duración | Detalle |\n"
    md_content += "|---|---|---|---|\n"
    
    all_passed = True
    
    for step in audit_results["steps"]:
        status_icon = "✅" if step["success"] else "❌"
        if not step["success"]:
            all_passed = False
        md_content += f"| {step['name']} | {status_icon} | {step.get('duration', 0):.2f}s | Ver JSON para detalles |\n"
        
    md_content += "\n## Conclusión\n"
    if all_passed:
        md_content += "🎉 **LA APP ESTÁ LISTA PARA MVP (Técnicamente)**. Todos los checks pasaron.\n"
    else:
        md_content += "⚠️ **SE ENCONTRARON ERRORES**. Revisar log detallado.\n"

    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print(f"\n📄 Reporte guardado en: {REPORT_MD}")

def main():
    print("🚀 Iniciando Auditoría Maestra MVP...\n")
    
    # 1. Linting
    run_step("Linting (Análisis Estático)", "npm run lint", critical=False)
    
    # 2. Type Check / Build
    run_step("Build (TypeScript Check)", "npm run build", critical=True)
    
    # 3. Pruebas Unitarias
    run_step("Unit Tests (Vitest)", "npm run test", critical=True)
    
    # 4. Seguridad (Script Python)
    # Nota: Asumiendo que python está en path como 'python' o 'python3'
    python_cmd = "python" if sys.platform == "win32" else "python3"
    run_step("Seguridad (RLS Check)", f"{python_cmd} scripts/verificar_aislamiento_datos.py", critical=True)
    
    # 5. Guardar
    save_report()

if __name__ == "__main__":
    main()
