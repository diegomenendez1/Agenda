
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVerify() {
    console.log("--- Debug Verification (Authenticated as Lead) ---");

    // Authenticate As Lead
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'lead@test.com',
        password: 'SocialTest.2026'
    });
    if (authError) console.error("Auth Error:", authError);

    const user = (await supabase.auth.getUser()).data.user;
    console.log("Logged in as:", user.id);

    // List ALL tasks visible to me
    const { data: tasks, error } = await supabase.from('tasks').select('id, title, user_id, visibility, assignee_ids');

    if (error) {
        console.error("Select Error:", error);
        return;
    }

    console.log(`Visible Tasks: ${tasks.length}`);
    tasks.forEach(t => {
        console.log(`- [${t.title}] Owner: ${t.user_id} | Visibility: ${t.visibility}`);
    });
}

debugVerify().catch(console.error);
