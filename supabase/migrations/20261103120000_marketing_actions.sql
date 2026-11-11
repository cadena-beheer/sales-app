-- Marketing actions in an area, such as flyers, drawn on the "kansen" map so the sales manager can plan around them.
-- A set of postcodes (PC4, PC5 or PC6, mixed; a code covers every postcode it starts), like an area given out.
create table public.marketing_actions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (char_length(btrim(kind)) between 1 and 60),
  done_on date not null,
  postcodes text[] not null
    check (cardinality(postcodes) between 1 and 500
      and array_to_string(postcodes, ',') ~ '^[0-9]{4}[A-Z]{0,2}(,[0-9]{4}[A-Z]{0,2})*$'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.marketing_actions enable row level security;

create policy "Admins read marketing actions"
  on public.marketing_actions for select
  to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

create policy "Admins add marketing actions"
  on public.marketing_actions for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

create policy "Admins delete marketing actions"
  on public.marketing_actions for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));
