-- 1. Función de Jerarquía Recursiva (Escalable a N niveles)
-- Permite que un Director vea tareas de sus reportes directos e indirectos.
CREATE OR REPLACE FUNCTION public.is_manager_of(target_manager_id uuid, target_subordinate_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    WITH RECURSIVE hierarchy AS (
      -- Caso base: reportes directos
      SELECT id, reports_to 
      FROM public.profiles 
      WHERE reports_to = target_manager_id
      
      UNION ALL
      
      -- Caso recursivo: reportes de los reportes
      SELECT p.id, p.reports_to
      FROM public.profiles p
      INNER JOIN hierarchy h ON p.reports_to = h.id
    )
    SELECT 1 FROM hierarchy WHERE id = target_subordinate_id
  );
END;
$$;

-- 2. Índice GIN para búsquedas rápidas en arreglos de asignados
-- Crucial para escalar el RLS con 100+ usuarios
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids_gin ON public.tasks USING GIN (assignee_ids);

-- 3. Actualizar la política de RLS con soporte total
DROP POLICY IF EXISTS "Hierarchical Task Visibility" ON public.tasks;

CREATE POLICY "Hierarchical Task Visibility" ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id -- Dueño
  OR (assignee_ids @> ARRAY[auth.uid()::text]) -- Asignado
  OR (visibility = 'team') -- Equipo
  OR (public.is_manager_of(auth.uid(), user_id)) -- Manager Directo o Indirecto
  OR (
    -- QA-02 FIX: Soporte para tareas huérfanas y supervisión global
    -- Los Admins/Owners pueden ver tareas en estado 'review' de cualquier usuario
    -- para evitar bloqueos si un manager es eliminado.
    status = 'review' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'owner' OR role = 'admin')
    )
  )
);
