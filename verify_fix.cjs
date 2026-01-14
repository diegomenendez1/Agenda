
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';

const userA = { email: 'tester@test.com', pass: '123456' };

async function verifyFix() {
    console.log("🧪 Checking Profiles Fetch Performance...");
    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Login
    await client.auth.signInWithPassword({
        email: userA.email,
        password: userA.pass
    });

    const { data: { session } } = await client.auth.getSession();
    const start = Date.now();
    // Try to fetch own profile
    const { data, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
    const duration = Date.now() - start;

    if (error) {
        console.error("❌ Error fetching profile:", error.message);
    } else {
        console.log(`✅ Success! Fetched profile in ${duration}ms`);
        console.log("   Role:", data.role);
        console.log("   Reports To:", data.reports_to);
    }
}

verifyFix();
