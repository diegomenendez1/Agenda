---
name: Sincronización Automática Git
description: Asegura que los cambios críticos en el código local se respalden inmediatamente en el repositorio de GitHub.
---

# 🔄 Sincronización Automática Git

Esta habilidad está diseñada para garantizar que el trabajo crítico no se pierda. El agente debe utilizar esta habilidad proactivamente cuando detecte que se han realizado modificaciones sustanciales o críticas en el código.

## 🎯 Criterios de Activación
El agente **DEBE** ejecutar esta sincronización INMEDIATAMENTE cuando:
1. Se ha completado una funcionalidad importante o un hito en la tarea actual.
2. Se han realizado cambios en archivos de configuración críticos (ej. `package.json` cuando se añaden deps, cambios en infraestructura, migraciones de DB).
3. Se han realizado refactorizaciones complejas que podrían ser difíciles de revertir manualmente.
4. El usuario solicita explícitamente "guardar", "sincronizar" o "respaldar".

NO es necesario ejecutarla por cada cambio menor de formato o corrección de typos, a menos que el usuario lo pida.

## 🛠️ Procedimiento

1.  **Verificar Rama**: Identificar la rama actual.
    ```powershell
    git branch --show-current
    ```

2.  **Verificar Estado**: Revisar qué archivos han cambiado.
    ```powershell
    git status
    ```

3.  **Añadir Cambios**: Stagear los cambios.
    ```powershell
    git add .
    ```

4.  **Generar Commit**: Crear un mensaje de commit descriptivo en ESPAÑOL siguiendo [Conventional Commits](https://www.conventionalcommits.org/es/).
    *   `feat: ...` para nuevas funcionalidades.
    *   `fix: ...` para corrección de errores.
    *   `chore: ...` para tareas de mantenimiento.
    *   `refactor: ...` para cambios de código que no cambian funcionalidad.
    
    ```powershell
    git commit -m "tipo: descripción breve y clara del cambio crítico"
    ```

5.  **Sincronizar (Push)**: Enviar los cambios al repositorio remoto.
    ```powershell
    git push origin <rama_actual>
    ```

## ⚠️ Seguridad y Validaciones
- **Conflictos**: Si el `git push` falla por conflictos, el agente debe:
    1. Intentar `git pull --rebase origin <rama_actual>` para integrar cambios remotos.
    2. Resolver conflictos simples si es seguro y obvio.
    3. Si es complejo o hay riesgo de perder código, **DETENERSE y consultar al usuario**.
- **Archivos Sensibles**: CONFIRMAR que no se están añadiendo archivos de secretos `.env` nuevos que no estén en `.gitignore`.
