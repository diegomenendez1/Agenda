-- Enable RLS
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  description text,
  frequency text not null, -- 'daily', 'weekly'
  duration_minutes integer not null default 30,
  flexible_window jsonb, -- { start: "09:00", end: "17:00" }
  priority text default 'medium',
  color text,
  created_at timestamptz default now()
);

alter table public.habits enable row level security;

create policy "Users can CRUD their own habits"
  on public.habits for all
  using (auth.uid() = user_id);

-- Add new fields to tasks if they don't exist
alter table public.tasks add column if not exists duration integer; -- minutes
alter table public.tasks add column if not exists deadline timestamptz; -- strict deadline
