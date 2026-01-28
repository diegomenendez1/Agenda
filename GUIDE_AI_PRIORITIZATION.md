# Guía de Implementación: Priorización con AI vía N8N

Como la terminal tiene restricciones de seguridad, hemos optado por la solución más robusta: **Usar tu n8n existente**.

## 🚀 Pasos para Activar (Solo 2 minutos)

Ya he preparado todo el código en el archivo `n8n_prioritizer_workflow.json` en tu escritorio.

### 1. Importar el Flujo en n8n
1. Abre tu n8n (o ve a tu dashboard).
2. Crea un **Nuevo Workflow**.
3. Haz clic en los **tres puntos (...)** arriba a la derecha > **Import from File**.
4. Selecciona el archivo `n8n_prioritizer_workflow.json` que está en tu carpeta AGENDA.
   - **IMPORTANTE:** Si ya lo importaste antes, bórralo e importa este nuevo archivo. **He corregido un error** por el que daba "Unexpected end of JSON". Este nuevo archivo espera correctamente a que la AI termine antes de responder a tu App.

### 2. Configurar Credenciales en n8n
El flujo importado necesita acceso a OpenAI y Supabase.
1. **OpenAI Node:** Haz doble clic en el nodo "AI Prioritizer".
   - En "Credential for OpenAI API", selecciona tu cuenta o crea una nueva ("Create New") y pega tu Key.
   - **Nota:** He configurado el modelo a `gpt-5-mini` como solicitaste.

2. **Supabase Update Node:** Haz doble clic en el nodo "Supabase Update".
   - Necesita una credencial "Header Auth". Crea una nueva:
   - Name: `apikey`
   - Value: (Tu Key Anónima de Supabase)
   - En Authorization también necesitarás añadir `Authorization: Bearer <MISMA_KEY>` si n8n lo pide, pero con header `apikey` suele bastar.

### 3. Activar
1. Haz clic en **"Activate"** (switch arriba a la derecha).
2. ¡Listo! Vuelve a tu App y presiona el botón "AI Sort" ✨.

---
**Nota Técnica:**
La App envía tus tareas a este Webhook de n8n. n8n las procesa con GPT-5-Mini y actualiza Supabase directamente. La App detecta los cambios en tiempo real y reordena la lista automáticamente.
