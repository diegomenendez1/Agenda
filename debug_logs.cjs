
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log("Debugging Activity Logs RLS...");

    // Auth as Lead
    await supabase.auth.signInWithPassword({
        email: 'lead@test.com',
        password: 'SocialTest.2026'
    });

    const user = (await supabase.auth.getUser()).data.user;
    console.log("Logged in:", user.id);

    // Try Insert
    const { data, error } = await supabase.from('activity_logs').insert({
        task_id: 'e1adbc8b-00fa-48d2-afb5-ac9590f98470', // Project ID used as task ID just for testing insert, or use a real task ID
        // Wait, activity logs need a valid task_id that exists in tasks table usually due to FK?
        // Let's use the API Integration task ID: '6fc1a087-02e8-43de-b804-0972e3f035e4' (from previous output)
        task_id: '6fc1a087-02e8-43de-b804-0972e3f035e4',
        user_id: user.id,
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
