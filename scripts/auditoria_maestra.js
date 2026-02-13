import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';

// Promisify exec
const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const TMP_DIR = path.resolve(__dirname, '../.tmp');
const REPORT_JSON = path.join(TMP_DIR, "reporte_auditoria_final.json");
const REPORT_MD = path.join(TMP_DIR, "reporte_auditoria_final.md");

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

const auditResults = {
    timestamp: new Date().toISOString(),
    steps: []
};

async function runStep(name, command, critical = true) {
    console.log(`\n--- Ejecutando: ${name} ---`);
    const startTime = Date.now();
    let success = false;
    let output = "";

    try {
        const { stdout, stderr } = await execAsync(command);
        output = stdout + "\n" + stderr;
        success = true; // Si exec no lanza error, el exit code fue 0
        console.log(`✅ ${name}: PASSED`);
    } catch (error) {
        success = false;
        output = error.stdout + "\n" + error.stderr;
        console.log(`❌ ${name}: FAILED`);
        console.log(`Output:\n${output.substring(0, 500)}...`);
    }

    const duration = (Date.now() - startTime) / 1000;

    auditResults.steps.push({
        name,
        success,
        duration,
        command,
        output: output.substring(0, 2000) // Truncar
    });

    if (!success && critical) {
        console.log("⛔ Error crítico detectado. Abortando auditoría.");
        saveReport();
        process.exit(1);
    }

    return success;
}

function saveReport() {
    // Guardar JSON
    fs.writeFileSync(REPORT_JSON, JSON.stringify(auditResults, null, 2), 'utf-8');

    // Generar Markdown
    let mdContent = `# Reporte de Auditoría Final MVP\n\n`;
    mdContent += `**Fecha:** ${auditResults.timestamp}\n\n`;
    mdContent += `| Paso | Estado | Duración | Detalle |\n`;
    mdContent += `|---|---|---|---|\n`;

    let allPassed = true;

    auditResults.steps.forEach(step => {
        const statusIcon = step.success ? "✅" : "❌";
        if (!step.success) allPassed = false;
        mdContent += `| ${step.name} | ${statusIcon} | ${step.duration.toFixed(2)}s | Ver JSON para detalles |\n`;
    });

    mdContent += `\n## Conclusión\n`;
    if (allPassed) {
        mdContent += `🎉 **LA APP ESTÁ LISTA PARA MVP (Técnicamente)**. Todos los checks pasaron.\n`;
    } else {
        mdContent += `⚠️ **SE ENCONTRARON ERRORES**. Revisar log detallado.\n`;
    }

    fs.writeFileSync(REPORT_MD, mdContent, 'utf-8');
    console.log(`\n📄 Reporte guardado en: ${REPORT_MD}`);
}

async function main() {
    console.log("🚀 Iniciando Auditoría Maestra MVP (Node.js Version)...\n");

    try {
        // 1. Linting
        await runStep("Linting (Análisis Estático)", "npm run lint", false);

        // 2. Type Check / Build
        await runStep("Build (TypeScript Check)", "npm run build", true);

        // 3. Pruebas Unitarias
        await runStep("Unit Tests (Vitest)", "npm run test", true);

        // 4. Seguridad (Script JS)
        // Usamos node para ejecutar el script hermano
        const scriptPath = path.join(__dirname, 'verificar_aislamiento_datos.js');
        // Necesitamos asegurar que node pueda ejecutar modulos ES, así que usamos node directamente
        await runStep("Seguridad (RLS Check)", `node "${scriptPath}"`, true);

    } catch (err) {
        console.error("Error fatal en el orquestador:", err);
    } finally {
        // 5. Guardar
        saveReport();
    }
}

main();
