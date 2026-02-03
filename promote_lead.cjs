require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
