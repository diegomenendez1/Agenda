-- Enable RLS
alter table public.tasks enable row level security;

-- Activity Logs Table
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null, -- Null if system action
  type text not null check (type in ('message', 'status_change', 'assignment', 'creation', 'update', 'upload')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Activity Logs (Inherits access from Task?)
-- Simplify for now: If you can see the task, you can see the logs.
alter table public.activity_logs enable row level security;

create policy "Users can view activities for tasks they can see"
  on public.activity_logs for select
  using (
    exists (
      select 1 from public.tasks
      where tasks.id = activity_logs.task_id
      -- Add your task visibility logic here, e.g.
      -- and (tasks.owner_id = auth.uid() or tasks.visibility = 'team')
    )
  );

create policy "Users can insert activities for tasks they can see"
  on public.activity_logs for insert
  with check (
    exists (
      select 1 from public.tasks
      where tasks.id = activity_logs.task_id
    )
  );
