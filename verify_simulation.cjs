
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
const supabase = createClient(supabaseUrl, supabaseKey);


async function verify() {
    // Authenticate as Lead to view protected data
    await supabase.auth.signInWithPassword({
        email: 'lead@test.com',
        password: 'SocialTest.2026'
    });

    console.log("--- Verification Report (Authenticated as Lead) ---");

    // 1. Check Task 1
    const { data: tasks1 } = await supabase.from('tasks').select('*').eq('title', 'Main Stage UX Polish').order('created_at', { ascending: false });
    const task1 = tasks1?.[0]; // Get the latest one
    if (task1) {
        console.log(`\n[Scenario 1] Task Found: ${task1.title}`);
        console.log(`Status: ${task1.status} (Expected: done)`);
        console.log(`Assignees: ${task1.assignee_ids?.length} (Expected: 2)`);

        const { data: logs1 } = await supabase.from('activity_logs').select('*').eq('task_id', task1.id).order('created_at');
        console.log(`Activity Logs: ${logs1?.length}`);
        logs1?.forEach(l => console.log(` - [${l.type}] User ${l.user_id.substring(0, 6)}...: ${l.content.substring(0, 50)}...`));
    } else {
        console.error("[Scenario 1] Task NOT Found!");
    }

    // 2. Check Task 2
    const { data: tasks2 } = await supabase.from('tasks').select('*').eq('title', 'API Integration').order('created_at', { ascending: false });
    const task2 = tasks2?.[0];
    if (task2) {
        console.log(`\n[Scenario 2] Task Found: ${task2.title}`);
        console.log(`Status: ${task2.status} (Expected: backlog)`);

        const { data: logs2 } = await supabase.from('activity_logs').select('*').eq('task_id', task2.id).order('created_at');
        console.log(`Activity Logs: ${logs2?.length}`);
        logs2?.forEach(l => console.log(` - [${l.type}] User ${l.user_id.substring(0, 6)}...: ${l.content.substring(0, 50)}...`));
    } else {
        console.error("[Scenario 2] Task NOT Found!");
    }
}

verify().catch(console.error);
