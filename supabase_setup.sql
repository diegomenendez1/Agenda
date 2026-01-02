-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends the default auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user',
  preferences jsonb default '{"theme": "dark", "autoPrioritize": true}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PROJECTS
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  name text not null,
  goal text,
  status text default 'active',
  color text default '#6366f1',
  created_at bigint default extract(epoch from now()) * 1000, -- storing as timestamp number to match app
  updated_at bigint default extract(epoch from now()) * 1000
);
alter table public.projects enable row level security;
create policy "Users can CRUD own projects" on public.projects for all using (auth.uid() = user_id);

-- 3. TASKS
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  description text,
  status text default 'todo', -- 'todo', 'in_progress', 'review', 'done'
  priority text default 'medium', -- 'critical', 'high', 'medium', 'low', 'auto'
  project_id uuid references public.projects(id) on delete set null,
  due_date bigint,
  estimated_minutes integer,
  assignee_id text, -- simplified for now
  smart_analysis jsonb,
  tag_ids text[], -- simple array of strings/ids
  created_at bigint default extract(epoch from now()) * 1000,
  completed_at bigint
);
alter table public.tasks enable row level security;
create policy "Users can CRUD own tasks" on public.tasks for all using (auth.uid() = user_id);

-- 4. INBOX ITEMS
create table public.inbox_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  text text not null,
  source text default 'manual', -- 'manual', 'email', 'system'
  processed boolean default false,
  created_at bigint default extract(epoch from now()) * 1000
);
alter table public.inbox_items enable row level security;
create policy "Users can CRUD own inbox items" on public.inbox_items for all using (auth.uid() = user_id);

-- 5. NOTES
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  body text,
  project_id uuid references public.projects(id) on delete set null,
  tags text[],
  created_at bigint default extract(epoch from now()) * 1000,
  updated_at bigint default extract(epoch from now()) * 1000
);
alter table public.notes enable row level security;
create policy "Users can CRUD own notes" on public.notes for all using (auth.uid() = user_id);

-- 6. TEAM MEMBERS (Simple mock for now, or link to users later)
create table public.team_members (
  id text primary key, -- keeping text id to match current uuid/mock logic
  user_id uuid references auth.users not null default auth.uid(), -- owner of this definition
  name text not null,
  role text,
  email text,
  avatar text
);
alter table public.team_members enable row level security;
create policy "Users can CRUD own team members" on public.team_members for all using (auth.uid() = user_id);

