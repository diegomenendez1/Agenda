-- Check policies for tasks
SELECT * FROM pg_policies WHERE tablename = 'tasks';

-- Check user profile for Owner
SELECT id, email, role, organization_id FROM profiles WHERE email = 'diegomenendez1@gmail.com';
