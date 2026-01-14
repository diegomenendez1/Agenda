
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// Prefer SERVICE_ROLE_KEY for migrations if available in .env, otherwise ANON (but ANON might fail for some DDL if not Owner)
// Actually, 'exec_sql' usually creates logic defined with SECURITY DEFINER so Anon might work if the RPC is exposed.
// Let's stick to what worked in the previous script (ANON_KEY).

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySql() {
    const sqlPath = path.join(__dirname, 'migrations_team_hierarchy.sql');
    try {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Applying SQL migration: migrations_team_hierarchy.sql");
        console.log("Length:", sql.length);

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error("RPC Error:", error);
            console.error("Details:", error.message, error.details);
            process.exit(1);
        } else {
            console.log("Migration applied successfully via RPC!");
        }
    } catch (err) {
        console.error("File Read/Execution Error:", err);
        process.exit(1);
    }
}

applySql();
