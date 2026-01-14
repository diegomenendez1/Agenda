
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listPolicies() {
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
            SELECT policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'profiles';
        `
    });

    if (error) {
        console.error("Error fetching policies:", error);
    } else {
        console.log("Active Policies on 'profiles':");
        console.table(data);
    }
}

listPolicies();
