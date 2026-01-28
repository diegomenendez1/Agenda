-- PASO 1: CONFIRMAR EMAIL (Vital para entrar)
-- Replace 'YOUR_EMAIL_HERE' with the actual email
-- Replace 'YOUR_SECURE_PASSWORD' with your actual password
UPDATE auth.users
SET email_confirmed_at = now(),
    encrypted_password = crypt('YOUR_SECURE_PASSWORD', gen_salt('bf')) 
WHERE email = 'YOUR_EMAIL_HERE';

-- PASO 2: CREAR O ACTUALIZAR PERFIL DE OWNER
INSERT INTO public.profiles (id, email, full_name, role, avatar_url, organization_id)
SELECT 
    id, 
    email, 
    'Owner User', -- Replace with Real Name
    'owner', 
    'https://ui-avatars.com/api/?name=Owner+User&background=f59e0b&color=fff',
    NULL -- Explicitly set organization_id to NULL to avoid default assignment
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (id) DO UPDATE
SET 
    role = 'owner',
    organization_id = NULL; -- Ensure no organization on update either

-- PASO 3: ARREGLAR PERMISOS (Para que veas la tabla de Admin)
-- Borrar politicas viejas si existen
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles Access" ON public.profiles;
DROP POLICY IF EXISTS "Owner Manage Profiles" ON public.profiles;

-- Nueva Regla 1: TODOS pueden VER perfiles (necesario para el Team Board)
CREATE POLICY "Public Profiles Access" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

-- Nueva Regla 2: SOLO el OWNER puede EDITAR perfiles (roles)
CREATE POLICY "Owner Manage Profiles" ON public.profiles
FOR UPDATE USING (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  )
);
