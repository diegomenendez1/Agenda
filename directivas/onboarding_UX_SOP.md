# Directiva: Optimización de UX para Usuarios Nuevos (Onboarding)

## 🎯 Objetivo
Garantizar que la primera experiencia del usuario sea intuitiva, emocionante y libre de fricciones. El usuario debe entender el valor de la app en menos de 2 minutos.

## 🛠 Entradas y Lógica
1.  **Flujo de Registro**: Debe ser rápido. Los datos de perfil por defecto deben ser lógicos (ej. avatar con iniciales).
2.  **Pantalla de Bienvenida (OnboardingView)**:
    *   Diseño premium con gradientes sutiles.
    *   Paso único: Crear o unirse a un Workspace.
3.  **Estados Vacíos (Empty States)**:
    *   **NO mostrar listas vacías sin contexto.**
    *   Cada módulo vacío (`Inbox`, `Tasks`, `Notes`) debe tener:
        *   Icono ilustrativo.
        *   Título descriptivo ("Todo listo por aquí").
        *   Subtítulo explicativo ("Parece que no tienes tareas pendientes...").
        *   **CTA (Call to Action)**: Un botón claro para "Crear nueva..." o "Ir al Inbox".
4.  **Tour Guiado**:
    *   Debe ser interactivo.
    *   Debe explicar el concepto de "Capturar -> Procesar -> Ejecutar".

## ⚠️ Casos Borde y Trampas
*   **Tour en Tableros Vacíos**: El tour no debe fallar si intenta resaltar `#first-inbox-item` y no hay nada. Debe haber un "fallback" o un elemento demo si el tour lo requiere.
*   **Responsividad**: El onboarding debe verse perfecto en móviles (muchos usuarios se registran desde el teléfono).

## ✅ Checklist de Salida
1.  OnboardingView con diseño actualizado.
2.  Estado vacío en KanbanBoard con CTA de creación.
3.  Estado vacío en NotesView con CTA de creación.
4.  Tour actualizado con textos más inspiradores.
