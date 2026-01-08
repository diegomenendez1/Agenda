# Productivity SaaS MVP

## Project Overview
This is a Premium Productivity SaaS application built with:
- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS (Custom Design System)
- **Backend/DB**: Supabase (PostgreSQL + RLS)
- **Automation/AI**: n8n Webhooks + LLM Agents

## Environment Setup

### Local Development
1. Clone the repository.
2. create a `.env` file with the following:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/uuid
   ```
3. Run `npm install`
4. Run `npm run dev` in terminal 1.
5. (Optional) Run `npx supabase status` if using local Supabase.

### Production Deployment (Netlify/Vercel)
1. **Build Command**: `npm run build`
2. **Publish Directory**: `dist`
3. **Environment Variables**:
   You **MUST** set the following in your Netlify/Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_N8N_WEBHOOK_URL` (Crucial for AI features to work in production!)

## Architecture Notes
- **API Proxy**: In local dev (`npm run dev`), requests to `/api/auto-process` are proxied to `VITE_N8N_WEBHOOK_URL` to avoid CORS.
- **Production API**: In production, the app calls `VITE_N8N_WEBHOOK_URL` directly. Ensure your n8n instance allows CORS for your production domain.
- **State Management**: Zustand store (`src/core/store.ts`).
- **Resilience**: API calls use `fetchWithRetry` (`src/core/api.ts`) for robustness.
