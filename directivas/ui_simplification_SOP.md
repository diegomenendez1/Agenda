# Directiva: Simplificación de Interfaz (UI Cleanup) - SOP

## Objetivo
Mantener una interfaz minimalista y libre de redundancias, eliminando elementos que ya existen en componentes globales (como el Sidebar).

## Contexto
En la transición hacia una aplicación más cohesiva, ciertos botones de acción locales se vuelven redundantes si la misma acción está disponible de forma persistente en la barra lateral o navegación global.

## Procedimiento

1. **Identificación de Redundancia**:
   - Verificar si una acción (ej. "Nueva Tarea") está disponible en el Sidebar.
   - Si la acción local no ofrece una ventaja contextual crítica, marcarla para eliminación.

2. **Ejecución**:
   - Localizar el componente de vista (ej. `TaskListView.tsx`).
   - Eliminar el bloque JSX del botón redundante.
   - Si el botón era el único elemento en un contenedor de acciones, evaluar si el contenedor también debe ser eliminado o ajustado.

3. **Verificación**:
   - Asegurarse de que la acción global (Sidebar) sigue funcionando correctamente.
   - Comprobar que el layout no se rompe al eliminar el elemento (ej. espacios en blanco extraños o desalineación).

## Trampas Conocidas / Restricciones
- **No eliminar lógica subyacente**: Si el botón ejecutan una lógica compleja que no está en el componente global, asegúrate de que el componente global tenga acceso a esa lógica o disparadores (triggers).
- **Consistencia en Mobile**: A veces, el Sidebar se oculta en mobile. Asegúrate de que el botón de "Nueva Tarea" (o similar) sea accesible a través de un FAB (Floating Action Button) o que el Sidebar sea fácil de abrir.

## Historial de Cambios
- **2024-02-13**: Eliminado el botón "New Task" de `TaskListView.tsx` por redundancia con el Sidebar.
