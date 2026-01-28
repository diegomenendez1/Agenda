
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// Preference for SERVICE_ROLE_KEY if available for admin tasks

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySql() {
    const sqlPath = path.join(__dirname, 'fix_critical_privacy_breach.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Applying Critical Privacy Fix...");

    // Try exec_sql RPC
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error("RPC Error:", error);
        console.warn("Please run 'fix_critical_privacy_breach.sql' manually in the Supabase Dashboard SQL Editor.");
        process.exit(1);
    } else {
        console.log("SUCCESS: Privacy breach fixed. Strict RLS and cleanup applied.");
    }
}

applySql();
