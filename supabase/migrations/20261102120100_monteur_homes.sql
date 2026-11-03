-- Where the monteurs live, for the pins on the "kansen" map: the sales manager plans wervers near a monteur. These are
-- home addresses, so only admins can read or change them. A wrong one is deleted and entered again; no update policy.
create table public.monteur_homes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  postcode text not null check (postcode ~ '^[1-9][0-9]{3}[A-Z]{2}$'),
  huisnummer text not null check (huisnummer ~ '^[0-9]{1,6}$'),
  toevoeging text not null default '' check (char_length(toevoeging) <= 10),
  -- From PDOK, when the address was entered.
  straat text not null default '' check (char_length(straat) <= 200),
  plaats text not null default '' check (char_length(plaats) <= 200),
  lon double precision not null check (lon between 2.5 and 8),
  lat double precision not null check (lat between 50 and 54),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.monteur_homes enable row level security;

create policy "Admins read monteur homes"
  on public.monteur_homes for select
  to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

create policy "Admins add monteur homes"
  on public.monteur_homes for insert
  to authenticated
  with check (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));

create policy "Admins delete monteur homes"
  on public.monteur_homes for delete
  to authenticated
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin));
