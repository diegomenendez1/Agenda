-- PASO 1: CONFIRMAR EMAIL (Vital para entrar)
UPDATE auth.users
SET email_confirmed_at = now(),
    encrypted_password = crypt('Yali.202', gen_salt('bf')) -- Intentamos resetear password tambien por si acaso
WHERE email = 'diegomenendez1@gmail.com';

-- PASO 2: CREAR O ACTUALIZAR PERFIL DE OWNER
INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
SELECT 
    id, 
    email, 
    'Diego Menendez', 
    'owner', 
    'https://ui-avatars.com/api/?name=Diego+Menendez&background=f59e0b&color=fff'
FROM auth.users
WHERE email = 'diegomenendez1@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
    role = 'owner', 
    full_name = 'Diego Menendez';

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
