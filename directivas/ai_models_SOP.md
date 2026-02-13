# Directiva: Estándares de Modelos de Inteligencia Artificial

## Objetivo
Asegurar que todas las funcionalidades de Inteligencia Artificial dentro del proyecto utilicen el modelo más avanzado y eficiente disponible, siguiendo la preferencia estricta del usuario.

## Modelo Estándar
- **Modelo Principal:** `gpt-5-mini`
- **Proveedor:** OpenAI

## Reglas de Implementación
1. **Prioridad Absoluta:** Cualquier nueva funcionalidad que requiera un LLM (Large Language Model) DEBE configurarse para usar `gpt-5-mini`.
2. **Actualización Automática:** Si se detecta el uso de modelos antiguos (como `gpt-4o-mini`, `o4-mini` o `gpt-4.1`), deben ser actualizados inmediatamente a `gpt-5-mini`.
3. **Consistencia en Edge Functions:** Las funciones de Supabase (`edge-functions`) deben tener el modelo `gpt-5-mini` definido en su lógica de llamada a la API de OpenAI.
4. **Consistencia en Cliente:** El código frontend que realice llamadas directas (ej. `aiPrioritization.ts`) también debe apuntar a este modelo.

## Historial de Decisiones
- **2026-02-13:** El usuario estableció `gpt-5-mini` como el modelo obligatorio para todo el proyecto, citando la retirada de modelos anteriores por parte de OpenAI.

## Trampas Conocidas
- **Verificación de ID:** Asegurarse de que el ID del modelo sea exactamente `gpt-5-mini`. Si la API devuelve un error de "Model not found", verificar la disponibilidad regional o la configuración de la API Key.
