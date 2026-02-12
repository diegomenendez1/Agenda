# DIRECTIVA: APP_LAUNCH_SOP

> **ID:** 2026-02-12
> **Script Asociado:** `npm run dev`
> **Última Actualización:** 2026-02-12
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Iniciar el servidor de desarrollo para visualizar y probar la aplicación AGENDA localmente.
- **Criterio de éxito:** El servidor de Vite se inicia correctamente y se proporciona una URL local (ej. http://localhost:5173).

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Archivos Fuente:**
  - `package.json`: Debe contener el script `"dev": "vite"`.
  - `node_modules/`: Debe estar presente (dependencias instaladas).

### Salidas (Outputs)
- **Retorno de Consola:** Mensaje de Vite indicando que el servidor está corriendo y la URL.
- **Visualización:** La aplicación es accesible vía navegador.

## 3. Flujo Lógico (Algoritmo)

1. **Verificación de Dependencias:** Asegurarse de que `node_modules` existe. Si no, ejecutar `environment_initialization_SOP`.
2. **Ejecución del Servidor:** Ejecutar `npm run dev`.
3. **Monitoreo:** Capturar la URL de salida y confirmar que no hay errores críticos en la terminal.

## 4. Herramientas y Librerías
- **Node.js**
- **Vite**

## 5. Restricciones y Casos Borde (Edge Cases)
- **Puerto Ocupado:** Si el puerto 5173 está ocupado, Vite intentará otro.
- **Errores de Compilación:** Si hay errores en el código (TS/TSX), el servidor puede fallar al renderizar.
- **Variables de Entorno:** Se asume que el archivo `.env` está configurado correctamente para Supabase.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 2026-02-12 | PowerShell execution policies | Entorno restringido | Usar `cmd /c npm run dev` si es necesario. |

## 7. Ejemplos de Uso

```bash
# Iniciar server de desarrollo
npm run dev
```

## 8. Checklist de Pre-Ejecución
- [x] Existe `package.json`
- [x] Carpeta `node_modules` existe

## 9. Checklist Post-Ejecución
- [x] Servidor corriendo en localhost (http://localhost:3000)
- [x] Sin errores de tipos en la terminal inicial
