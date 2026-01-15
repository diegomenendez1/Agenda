
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySql() {
    const sqlPath = path.join(__dirname, 'remediate_security_isolation_v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Applying Security Remediation SQL...");

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("RPC Error:", error);
        console.warn("Manual SQL execution required.");
    } else {
        console.log("Migration applied successfully!");
    }
}

applySql();
