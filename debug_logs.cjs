require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log("Debugging Activity Logs RLS with Service Role...");

    // Using Service Role Key bypasses the need for signIn for DB operations.
    // Let's find the Head user to use as a reference
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', 'test1@test.com').single();

    if (!profile) {
        console.error("Test profile not found. Please ensure 'test1@test.com' exists.");
        return;
    }

    const userId = profile.id;
    console.log("Using User ID:", userId);

    // Try Insert
    const { data, error } = await supabase.from('activity_logs').insert({
        task_id: 'e1adbc8b-00fa-48d2-afb5-ac9590f98470', // Project ID used as task ID just for testing insert, or use a real task ID
        // Wait, activity logs need a valid task_id that exists in tasks table usually due to FK?
        // Let's use the API Integration task ID: '6fc1a087-02e8-43de-b804-0972e3f035e4' (from previous output)
        task_id: '6fc1a087-02e8-43de-b804-0972e3f035e4',
        user_id: userId,
        type: 'debug',
        content: 'Debug log entry',
        created_at: new Date().toISOString()
    }).select();

    if (error) {
        console.error("Insert Error:", error);
    } else {
        console.log("Insert Success:", data);
    }

    // Try Select
    const { data: logs, error: selectError } = await supabase.from('activity_logs').select('*');
    if (selectError) {
        console.error("Select Error:", selectError);
    } else {
        console.log("Logs found:", logs.length);
    }
}

debug().catch(console.error);
