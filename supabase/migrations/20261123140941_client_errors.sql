-- Errors on the phone that the server never sees (photo processing, storage on the phone), so they can be looked up
-- per recruiter instead of guessed from a screenshot. Written by the app, read in the dashboard or by admins.
create table public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  context text not null check (char_length(context) between 1 and 100),
  name text check (char_length(name) <= 200),
  message text check (char_length(message) <= 2000),
  stack text check (char_length(stack) <= 8000),
  user_agent text check (char_length(user_agent) <= 500),
  details jsonb check (pg_column_size(details) <= 8000)
);

create index client_errors_created_at on public.client_errors (created_at desc);
create index client_errors_user_id on public.client_errors (user_id);

alter table public.client_errors enable row level security;

create policy "Users add their own errors"
  on public.client_errors for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins read errors"
  on public.client_errors for select
  to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));
