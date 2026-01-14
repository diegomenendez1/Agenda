-- 1. REFORZAR PRIVACIDAD DE EQUIPO EN RLS
-- Modificar las políticas para que 'team' signifique realmente "mi equipo"

-- Función auxiliar para verificar si dos usuarios están en el mismo equipo
CREATE OR REPLACE FUNCTION public.are_in_same_team(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE status = 'active' AND (
      (manager_id = user_a AND member_id = user_b) OR
      (manager_id = user_b AND member_id = user_a) OR
      -- Si ambos tienen el mismo manager
      EXISTS (
        SELECT 1 FROM public.team_memberships t1, public.team_memberships t2
        WHERE t1.member_id = user_a AND t2.member_id = user_b 
        AND t1.manager_id = t2.manager_id AND t1.status = 'active' AND t2.status = 'active'
      )
    )
  );
END;
$$;

-- Actualizar política de Tareas
DROP POLICY IF EXISTS "Task Collaboration Policy" ON public.tasks;
CREATE POLICY "Task Collaboration Policy" ON public.tasks
FOR ALL USING (
    auth.uid() = user_id OR                     -- Creador
    assignee_id = auth.uid()::text OR           -- Asignado
    (visibility = 'team' AND public.are_in_same_team(user_id, auth.uid())) OR -- Miembro del equipo
    project_id IN (                             -- Proyecto compartido
        SELECT id FROM public.projects 
        WHERE auth.uid()::text = ANY(members) OR (visibility = 'team' AND public.are_in_same_team(user_id, auth.uid()))
    )
);

-- 2. FUNCIONES PARA DESVINCULAR

-- Función para que un MIEMBRO deje el equipo
CREATE OR REPLACE FUNCTION leave_team(p_manager_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.team_memberships 
    WHERE manager_id = p_manager_id AND member_id = auth.uid() AND status = 'active';
END;
$$;

-- Función para que un MANAGER elimine a un miembro
CREATE OR REPLACE FUNCTION remove_team_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.team_memberships 
    WHERE manager_id = auth.uid() AND member_id = p_member_id AND status = 'active';
END;
$$;

-- 3. MEJORAR VISTA DE PERFIL (Vincular perfiles en membresías)
-- (Ya existe la política "Users can view their own memberships" que permite ver manager_id y member_id)
