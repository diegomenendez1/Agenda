# DIRECTIVA: CLEANUP_LEGACY_VIEWS_SOP

> **ID:** 2026-02-12-CLEANUP
> **Script Asociado:** N/A (Modificación directa de código)
> **Última Actualización:** 2026-02-12
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Eliminar las vistas "Table" y "List" del módulo de Tareas, consolidando la experiencia en la vista "Kanban Board".
- **Criterio de éxito:** La aplicación compila sin errores, las opciones de cambio de vista han desaparecido y la vista por defecto es el Board.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- `src/features/tasks/TaskFiltersBar.tsx`: Componente con los botones de cambio de vista.
- `src/features/tasks/TaskListView.tsx`: Componente contenedor que renderiza las vistas condicionalmente.
- `src/features/tasks/TaskTable.tsx`: Componente a eliminar.

### Salidas (Outputs)
- Código refactorizado sin referencias a las vistas eliminadas.
- Archivo `TaskTable.tsx` eliminado.

## 3. Flujo Lógico (Algoritmo)

1. **Refactorizar `TaskFiltersBar`:** Eliminar props `viewMode`, `setViewMode` y los botones correspondientes.
2. **Refactorizar `TaskListView`:** 
   - Eliminar estados y lógica de `viewMode`.
   - Eliminar importación de `TaskTable`.
   - Renderizar incondicionalmente `<KanbanBoard />`.
3. **Eliminar Archivos:** Borrar `TaskTable.tsx`.
4. **Verificación:** Compilar y verificar visualmente.

## 4. Restricciones y Casos Borde
- **Persistencia de Preferencias:** Aunque eliminamos la UI, el usuario podría tener `taskViewMode` guardado en su perfil. Esto no romperá la app pero el valor será ignorado. Idealmente se limpiaría pero no es crítico.

## 5. Protocolo de Errores
- Si la compilación falla por props faltantes, verificar que `TaskFiltersBar` no se esté llamando con los props eliminados en otros lugares (aunque es usado localmente en `TaskListView`).
