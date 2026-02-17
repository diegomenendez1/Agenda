# SOP: Optimización de Interfaz de Usuario (UI)

Este documento define las directrices para mejorar componentes visuales en el proyecto AGENDA, asegurando un acabado "Premium" y una experiencia de usuario fluida.

## Principios de Diseño
1.  **Tipografía:** Usar `Outfit` para títulos y `Inter` para cuerpo de texto para un contraste moderno.
2.  **Color:** Evitar colores planos básicos. Usar degradados sutiles y paletas basadas en HSL (especialmente Indigo y Slate).
3.  **Profundidad:** Utilizar `backdrop-filter: blur()`, sombras difusas y bordes sutiles (`border-subtle`).
4.  **Interactividad:** Todos los elementos interactivos deben tener estados de `:hover` y `:active` claramente definidos con transiciones suaves (`transition: all 0.2s`).
5.  **Animaciones:** Implementar micro-animaciones de entrada (entrada en cascada o staggered) para que la UI se sienta viva.

## Pasos para Optimización
1.  **Identificar Componente:** Localizar el archivo `.tsx` y sus dependencias.
2.  **Revisión de Estructura:** Asegurar el uso de componentes base como `SoftBadge`, `Button` o utilidades CSS globales.
3.  **Aplicar Capa Visual:**
    - Gradientes en textos destacados.
    - Refinamiento de sombras (`shadow-glow` para elementos destacados).
    - Spacing consistente (usar múltiplos de 4px).
4.  **Añadir Feedback Visual:** Estados de carga, hover y micro-interacciones.

## Restricciones y Casos Borde
- **Acceso a Datos:** No modificar la lógica de filtrado de datos a menos que sea necesario para la visualización.
- **Rendimiento:** Evitar el uso excesivo de `backdrop-blur` en componentes que se renderizan repetitivamente en listas largas.
- **Consistencia:** Mantener el uso de variables definidas en `index.css`.
