
-- Migrate Remaining Artifacts to Primary Organization
-- Target Org: 0d9103bc-9d34-4d4f-bbd3-87035eced875

BEGIN;

-- 1. Migrate Inbox Items
UPDATE inbox_items
SET organization_id = '0d9103bc-9d34-4d4f-bbd3-87035eced875'
WHERE user_id IN (
    '1277e639-ed84-4eae-82ae-d17c65d090e3', -- Diego
    '25d40901-43a6-4bd7-a98a-6d5f07afeadb', -- Karol
    'd1a27b19-1831-4222-8e12-dcf5d9c3b687'  -- Erick
);

-- 2. Migrate Projects
-- Note: Projects usually have 'owner_id' or similar. Checking schema...
-- Assuming projects have 'owner_id' or just 'organization_id'. 
-- If 'owner_id' matches our users, we move them.
UPDATE projects
SET organization_id = '0d9103bc-9d34-4d4f-bbd3-87035eced875'
WHERE owner_id IN (
    '1277e639-ed84-4eae-82ae-d17c65d090e3',
    '25d40901-43a6-4bd7-a98a-6d5f07afeadb',
    'd1a27b19-1831-4222-8e12-dcf5d9c3b687'
);

-- 3. Migrate Notes
UPDATE notes
SET organization_id = '0d9103bc-9d34-4d4f-bbd3-87035eced875'
WHERE user_id IN (
    '1277e639-ed84-4eae-82ae-d17c65d090e3',
    '25d40901-43a6-4bd7-a98a-6d5f07afeadb',
    'd1a27b19-1831-4222-8e12-dcf5d9c3b687'
);

COMMIT;
