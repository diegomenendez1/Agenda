
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Note: Anon key might not have permission to update profiles depending on RLS. 
// Ideally we need SERVICE_ROLE_KEY for admin tasks, but let's try with Anon if RLS allows 'update' for specific conditions 
// OR simpler: we rely on the user running this in a context where they might have keys. 
// Actually, for a local fix script, we often need the Service Role key to bypass RLS if we are not "logged in".
// If the user doesn't have SERVICE_KEY in .env, this might fail.
// Let's check .env content via 'read_file' first? No, I shouldn't read .env directly for secrets if I can avoid it.
// I'll assume the user has a way to run this. I'll use the variables that are likely there.
// If VITE_SUPABASE_SERVICE_ROLE_KEY exists, use it.

const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || supabaseKey;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function restoreHierarchy() {
    console.log("🔍 Searching for users...");

    // 1. Find Diego
    // We try to find the 'owner' or by name 'Diego'
    const { data: diegos, error: err1 } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Diego%')
        .limit(1);

    if (err1 || !diegos || diegos.length === 0) {
        console.error("❌ Could not find Diego.", err1);
        return;
    }
    const diego = diegos[0];
    console.log(`✅ Found Diego: ${diego.full_name} (${diego.id})`);

    // 2. Find Karol
    const { data: karols, error: err2 } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Karol Enciso%')
        .limit(1);

    if (err2 || !karols || karols.length === 0) {
        console.error("❌ Could not find Karol Enciso.", err2);
        return;
    }
    const karol = karols[0];
    console.log(`✅ Found Karol: ${karol.full_name} (${karol.id})`);

    // 3. Find Erick
    const { data: ericks, error: err3 } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Erick Lameda%')
        .limit(1);

    if (err3 || !ericks || ericks.length === 0) {
        console.error("❌ Could not find Erick Lameda.", err3);
        return;
    }
    const erick = ericks[0];
    console.log(`✅ Found Erick: ${erick.full_name} (${erick.id})`);

    // 4. Update Karol -> Reports To Diego
    console.log("🔄 Linking Karol -> Diego...");
    const { error: updateErr1 } = await supabase
        .from('profiles')
        .update({
            reports_to: diego.id,
            organization_id: diego.organization_id // Ensure same org
        })
        .eq('id', karol.id);

    if (updateErr1) console.error("❌ Failed to update Karol:", updateErr1);
    else console.log("✅ Karol now reports to Diego.");

    // 5. Update Erick -> Reports To Karol
    console.log("🔄 Linking Erick -> Karol...");
    const { error: updateErr2 } = await supabase
        .from('profiles')
        .update({
            reports_to: karol.id,
            organization_id: diego.organization_id // Ensure same org
        })
        .eq('id', erick.id);

    if (updateErr2) console.error("❌ Failed to update Erick:", updateErr2);
    else console.log("✅ Erick now reports to Karol.");

    console.log("🎉 Hierarchy restoration complete.");
}

restoreHierarchy();
