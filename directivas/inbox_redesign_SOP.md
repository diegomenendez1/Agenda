# DIRECTIVA: INBOX_HIGH_DENSITY_REDESIGN_SOP

> **ID:** 2026-02-12-INBOX-REDESIGN
> **Script Asociado:** N/A (Refactorización de Interfaz)
> **Última Actualización:** 2026-02-12
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Rediseñar la vista de Inbox de un sistema de cuadrícula (cards) a una lista de alta densidad optimizada para el "triaje" rápido de información.
- **Criterio de éxito:** La interfaz permite ver al menos el doble de elementos sin hacer scroll, con una jerarquía visual clara y acciones rápidas accesibles vía hover.

## 2. Especificaciones de Diseño (UI/UX)
- **Layout:** Lista vertical única (flex-col).
- **Densidad:** Altura de fila reducida (aprox 60-80px máximo si no está en modo edición).
- **Tipografía:** Uso de fuentes "Display" para el texto principal, pero con pesos que faciliten el escaneo rápido.
- **Interacción:** 
  - Las acciones individuales (Editar, Borrar) deben estar ocultas por defecto y aparecer solo al hacer hover sobre la fila.
  - El modo de selección masiva debe ser fluido y no romper el alineamiento de la lista.

## 3. Especificaciones Técnicas (I/O)
- **Entrada:** Estado de `inbox` del store de Zustand.
- **Salida:** Componente `InboxView` actualizado con el nuevo layout de lista.

## 4. Flujo de Refactorización
1.  **Macro-estructura:** Cambiar el contenedor de `grid` a una lista vertical simple con espacio controlado.
2.  **Item Design:** Rediseñar el mapeo de `inboxItems` para que cada uno sea una fila con alineación horizontal (Source -> Texto -> Fecha -> Acciones).
3.  **Hover State:** Implementar la visibilidad condicional de botones mediante CSS/Clsx.
4.  **Edit State:** Asegurar que cuando un ítem está en edición, la fila se expanda de forma limpia sin afectar drásticamente el resto de la lista.

## 5. Restricciones
- No eliminar la funcionalidad de "Bulk Action".
- Mantener la integración con `SmartInput`.
- Mantener el `ProcessItemModal` para el procesamiento individual.

## 6. Memoria Viva (Lecciones Aprendidas)
- *Nota Inicial:* El diseño de tarjetas original se percibía como "lento" para usuarios pro. La lista debe priorizar el contenido textual por encima de los iconos decorativos grandes.
