
-- Migrate Tasks to Primary Organization
-- Current User Org: 0d9103bc-9d34-4d4f-bbd3-87035eced875
-- Missing Tasks Source Org: f97b3c35-6a73-43ef-a33e-6ab82de1637e (Default)

BEGIN;

-- 1. Move Diego's Tasks
UPDATE tasks
SET organization_id = '0d9103bc-9d34-4d4f-bbd3-87035eced875'
WHERE user_id = '1277e639-ed84-4eae-82ae-d17c65d090e3';

-- 2. Move Karol's Tasks
UPDATE tasks
SET organization_id = '0d9103bc-9d34-4d4f-bbd3-87035eced875'
WHERE user_id = '25d40901-43a6-4bd7-a98a-6d5f07afeadb';

-- 3. Move Erick's Tasks
UPDATE tasks
SET organization_id = '0d9103bc-9d34-4d4f-bbd3-87035eced875'
WHERE user_id = 'd1a27b19-1831-4222-8e12-dcf5d9c3b687';


-- 4. Move Any Tasks assigned to them? (Optional but good for completeness)
-- If a task is assigned to Diego but owned by someone else, we might need to be careful.
-- For now, let's assume ownership drives the workspace location.

COMMIT;
