---
name: Creador de Habilidades
description: Una habilidad diseñada para guiar el proceso de creación y mantenimiento de otras habilidades en el espacio de trabajo de Antigravity, asegurando que sigan los estándares oficiales.
---

# 🛠️ Creador de Habilidades

Esta habilidad te permite sistematizar el conocimiento y las herramientas dentro de este espacio de trabajo mediante la creación de "Skills". Una Skill es un conjunto de instrucciones, scripts y recursos que extienden las capacidades del agente para tareas especializadas.

## 📋 Estructura de una Skill

Cada habilidad debe residir en su propia carpeta dentro de `.agent/skills/` y debe tener la siguiente estructura:

- `SKILL.md` (Obligatorio): El archivo principal de instrucciones con frontmatter YAML.
- `scripts/` (Opcional): Scripts de ayuda (bash, python, js, etc.).
- `examples/` (Opcional): Ejemplos de implementación o uso.
- `resources/` (Opcional): Archivos adicionales, plantillas o activos.

## 🚀 Cómo Crear una Nueva Habilidad

1. **Definir el Propósito**: Identifica una tarea recurrente o especializada que requiera un flujo de trabajo específico.
2. **Crear el Directorio**: `mkdir -p .agent/skills/nombre-de-la-habilidad`
3. **Redactar el SKILL.md**:
    - Incluye el frontmatter YAML al principio.
    - Describe claramente el objetivo de la habilidad.
    - Proporciona instrucciones paso a paso para el agente.
4. **Agregar Recursos**: Coloca cualquier script o archivo de apoyo en sus respectivas carpetas.

## 📝 Plantilla de SKILL.md

```markdown
---
name: [Nombre de la Habilidad]
description: [Breve descripción de lo que hace]
---

# [Nombre de la Habilidad]

[Descripción detallada]

## 🛠️ Herramientas y Requisitos
- [Pre-requisitos]
- [Dependencias]

## 📖 Instrucciones de Uso
1. [Paso 1]
2. [Paso 2]

## ⚠️ Consideraciones Especiales
- [Notas sobre seguridad, rendimiento o limitaciones]
```

## 🤖 Rol del Agente
Al activar una habilidad, el agente debe:
1. Leer el archivo `SKILL.md` íntegramente usando `view_file`.
2. Seguir las instrucciones exactas descritas en el archivo.
3. Utilizar los scripts y recursos proporcionados en las subcarpetas de la habilidad.
