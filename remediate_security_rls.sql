
-- 1. CORRECCIÓN DE PERSISTENCIA (Admin Update)
-- Permitir que Owners y Admins actualicen perfiles de otros
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Admin/Owner can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 2. AISLAMIENTO DE DATOS SENSIBLES (AI Context)
-- Crear tabla privada para IA si no existe
CREATE TABLE IF NOT EXISTS public.user_ai_metadata (
  user_id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  ai_context text,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_ai_metadata ENABLE ROW LEVEL SECURITY;

-- Solo el dueño y el admin pueden ver
CREATE POLICY "Users can view own AI context or Admin view all"
  ON public.user_ai_metadata FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Solo el dueño y el admin pueden editar
CREATE POLICY "Users can update own AI context or Admin update all"
  ON public.user_ai_metadata FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Migrar datos existentes de profiles.preferences->'aiContext' a la nueva tabla
INSERT INTO public.user_ai_metadata (user_id, ai_context)
SELECT id, (preferences->>'aiContext')
FROM public.profiles
WHERE preferences->>'aiContext' IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET ai_context = EXCLUDED.ai_context;

-- 3. FORTALECIMIENTO DE INVITACIONES
-- Añadir campo 'updated_at' a team_invitations si existe (simulado para este caso, pero buena práctica)
-- alter table public.team_invitations add column if not exists updated_at bigint;
