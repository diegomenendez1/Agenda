
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureAdmin() {
    // 1. Login as OWNER
    const ownerEmail = process.env.OWNER_EMAIL;
    const ownerPassword = process.env.OWNER_PASSWORD;

    if (!ownerEmail || !ownerPassword) {
        console.error("Error: OWNER_EMAIL and OWNER_PASSWORD environment variables must be set.");
        return;
    }

    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
        email: ownerEmail,
        password: ownerPassword
    });

    if (loginError) {
        console.error("Owner login failed:", loginError);
        return;
    }
    console.log("Logged in as Owner.");

    // 2. Find Lead ID
    // Now that we are owner, we can see profiles? 
    // AdminView.tsx says owners can see profiles.
    const { data: users, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'lead@test.com')
        .single();

    if (searchError) {
        console.error("Could not find Lead:", searchError);
        return;
    }
    console.log("Found Lead:", users.id, users.role);

    // 3. Promote to Admin if not already
    if (users.role !== 'admin' && users.role !== 'owner') {
        console.log("Promoting Lead to Admin...");
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', users.id);

        if (updateError) console.error("Update failed:", updateError);
        else console.log("Lead promoted to Admin!");
    } else {
        console.log("Lead is already", users.role);
    }
}

ensureAdmin();
