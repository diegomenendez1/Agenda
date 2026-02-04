---
name: creador_de_habilidades
description: Una habilidad experta para crear nuevas habilidades (skills) en español dentro del ecosistema Antigravity.
---

# Creador de Habilidades

Esta habilidad contiene las directrices y plantillas necesarias para crear nuevas habilidades operativas para el agente. Sigue estas instrucciones paso a paso para extender las capacidades de tu agente.

## 📁 Estructura de Directorios

El sistema de habilidades reside en el directorio `.agent/skills/`. Cada habilidad debe tener su propio subdirectorio con un nombre único y descriptivo.

Estructura recomendada:
```text
.agent/
└── skills/
    └── nombre_de_tu_habilidad/  <-- Usar snake_case
        ├── SKILL.md             <-- Archivo PRINCIPAL obligatorio
        ├── scripts/             <-- (Opcional) Scripts auxiliares (.py, .js, .sh)
        └── resources/           <-- (Opcional) Plantillas o archivos de datos
```

## 📝 Formato del Archivo SKILL.md

El archivo `SKILL.md` es el cerebro de la habilidad. Debe contener un encabezado YAML (frontmatter) seguido de instrucciones en Markdown.

### Plantilla Base

Copia y pega este contenido en tu nuevo `SKILL.md`:

```markdown
---
name: nombre_de_la_habilidad_en_snake_case
description: Una descripción concisa de una sola línea sobre qué problema resuelve esta habilidad.
---

# Título de la Habilidad (Legible para Humanos)

Breve introducción sobre el propósito de esta habilidad.

## Instrucciones

1.  **Paso 1**: Instrucción clara y atómica.
2.  **Paso 2**: Otra instrucción.

## Herramientas Sugeridas

- Enumera aquí si se recomienda usar ciertas herramientas (ej. `run_command`, `write_to_file`).

## Ejemplos

Ejemplos de cómo debería comportarse el agente o qué outputs se esperan.
```

## 🚀 Proceso de Creación (Paso a Paso)

Cuando el usuario te pida crear una nueva habilidad:

1.  **Analizar el Propósito**: Entiende qué problema resuelve la habilidad.
2.  **Nombrar**: Elige un nombre corto en `snake_case` (ej. `analisis_datos`, `deploy_aws`).
3.  **Crear Directorio**: Usa `write_to_file` para crear el archivo `SKILL.md` directamente en la ruta `.agent/skills/<nombre>/SKILL.md`. La herramienta creará las carpetas necesarias automáticamente.
4.  **Redactar Instrucciones**: Escribe el contenido del `SKILL.md` en el idioma preferido del usuario (Español por defecto si así se solicita), asegurando que el Frontmatter YAML sea correcto.

## ⚠️ Reglas Importantes

- **Validación YAML**: Asegúrate de que el bloque `---` al inicio esté correctamente formateado.
- **Rutas Absolutas**: Si la habilidad hace referencia a scripts en su carpeta `scripts/`, instruye al agente para que siempre resuelva la ruta absoluta de esos scripts antes de ejecutarlos.
- **Claridad**: Las instrucciones dentro de `SKILL.md` son para el AGENTE, no para el usuario. Escribe en modo imperativo: "Analiza el archivo...", "Ejecuta el script...", etc.
