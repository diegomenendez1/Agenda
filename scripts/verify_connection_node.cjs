require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testing Connection to:", supabaseUrl);

    // Test 1: Public Read
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

    if (error) {
        console.error("Public Read Failed:", error.message);
    } else {
        console.log("Public Read Success. Count:", data); // count is actually in count property
    }

    // Test 2: Auth Sign In
    const email = process.env.TEST_OWNER_EMAIL || 'diegomenendez1@gmail.com';
    const password = process.env.TEST_OWNER_PASSWORD || 'Yali.202';

    console.log(`Attempting login for ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error("Auth Failed:", authError.message);
    } else {
        console.log("Auth Success. User ID:", authData.user.id);
    }
}

testConnection();
