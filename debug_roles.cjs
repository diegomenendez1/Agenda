
const { createClient } = require('@supabase/supabase-js');

// Load env vars manually or assume present in shell, but for script safer to embed if dev
// Since we are in local dev, we can use the ones known from context
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data: users, error } = await supabase.from('profiles').select('email, role');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('User Roles:', users);
}

checkRoles();
