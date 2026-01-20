const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('No .env file found at', envPath);
    process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Needed to sign in as user without password if tricky, OR just sign in normally

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

// Users to test (MUST MATCH YOUR DB DATA)
const USERS = {
    OWNER: 'diegomenendez1@gmail.com',
    MEMBER: 'test3@test.com'
};

const PASSWORD = process.env.TEST_OWNER_PASSWORD || 'Yali.202'; // Fallback to verified password
const MEMBER_PASSWORD = '123456';

async function verifyRLS() {
    console.log('--- RLS SECURITY VERIFICATION ---');

    // 1. Authenticate as OWNER
    const ownerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: ownerAuth, error: ownerLoginErr } = await ownerClient.auth.signInWithPassword({
        email: USERS.OWNER,
        password: PASSWORD
    });

    if (ownerLoginErr) {
        console.error('Owner login failed:', ownerLoginErr.message);
        return;
    }
    console.log('[OK] Owner logged in:', ownerAuth.user.id);

    // 2. Authenticate as MEMBER
    const memberClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: memberAuth, error: memberLoginErr } = await memberClient.auth.signInWithPassword({
        email: USERS.MEMBER,
        password: MEMBER_PASSWORD
    });

    if (memberLoginErr) {
        console.error('Member login failed:', memberLoginErr.message);
        return;
    }
    console.log('[OK] Member logged in:', memberAuth.user.id);

    // Fetch correct organization_id from profile (metadata might be stale)
    const { data: ownerProfile } = await ownerClient
        .from('profiles')
        .select('organization_id')
        .eq('id', ownerAuth.user.id)
        .single();

    if (!ownerProfile || !ownerProfile.organization_id) {
        console.error('Owner has no organization_id in profiles table');
        return;
    }

    // 3. Owner creates a PRIVATE task
    const secretTaskTitle = `RLS_SECRET_${Date.now()}`;
    const { data: task, error: createErr } = await ownerClient.from('tasks').insert({
        title: secretTaskTitle,
        status: 'todo',
        priority: 'high',
        organization_id: ownerProfile.organization_id, // Use DB value
        user_id: ownerAuth.user.id, // Owner
        visibility: 'private',
        assignee_ids: [] // Not assigned to anyone
    }).select().single();

    if (createErr) {
        console.error('Failed to create secret task:', createErr);
        return;
    }
    console.log('[OK] Private task created by Owner:', task.id);

    // 4. Member attempts to READ the private task
    const { data: readData, error: readErr } = await memberClient
        .from('tasks')
        .select('*')
        .eq('id', task.id);

    if (readErr) {
        console.error('Unexpected error during read:', readErr);
    } else {
        if (readData.length === 0) {
            console.log('SUCCESS: Member CANNOT see private task. (Returned 0 rows)');
        } else {
            console.error('FAILURE: Member CAN see private task!', readData);
        }
    }

    // 5. Cleanup
    await ownerClient.from('tasks').delete().eq('id', task.id);
    console.log('[Cleanup] Task deleted.');
}

verifyRLS().catch(console.error);
