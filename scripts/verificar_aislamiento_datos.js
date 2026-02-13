import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde el root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Error: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY");
    process.exit(1);
}

async function verificarRLS() {
    console.log("\n--- Verificando RLS en Tablas ---");

    const tablasCriticas = ["tasks", "profiles", "inbox_items", "projects"];
    let veredictoFinal = true;

    console.log("1. Probando acceso anónimo (debe ser denegado o vacío)...");

    // Cliente anónimo para simular atacante externo
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    for (const tabla of tablasCriticas) {
        try {
            const { data, error } = await supabaseAnon.from(tabla).select("*").limit(1);

            if (error) {
                // Si da error de permiso, es bueno en este contexto
                console.log(`OK: Tabla '${tabla}' acceso denegado o error (Esperado: ${error.message}).`);
            } else if (data && data.length > 0) {
                console.error(`ALERTA: Tabla '${tabla}' devuelve datos a usuario anónimo! POSIBLE FUGA RLS.`);
                veredictoFinal = false;
            } else {
                console.log(`OK: Tabla '${tabla}' segura para anónimos (0 registros).`);
            }
        } catch (e) {
            console.log(`OK: Tabla '${tabla}' generó excepción: ${e.message}`);
        }
    }

    return veredictoFinal;
}

// Ejecutar
verificarRLS().then((success) => {
    if (success) {
        console.log("\n[PASSED] Verificación de Seguridad RLS completada satisfactoriamente.");
        process.exit(0);
    } else {
        console.log("\n[FAILED] Se detectaron problemas de seguridad RLS.");
        process.exit(1);
    }
}).catch(err => {
    console.error("Error inesperado:", err);
    process.exit(1);
});
