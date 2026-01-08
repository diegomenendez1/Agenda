-- Fix Profiles Visibility
-- We need to ensure that any authenticated user can view other users' profiles to see their names and avatars.

-- Drop existing likely restrictive policy if it exists (names vary, so we just add a broad one)
-- Supabase usually creates simple policies. 

-- Enable RLS just to be sure (it's likely enabled)
alter table public.profiles enable row level security;

-- Policy: Authenticated users can view all profiles
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);
