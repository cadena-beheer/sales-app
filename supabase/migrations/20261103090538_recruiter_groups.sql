-- Groups of wervers, usually an office. A werver is in at most one group (profiles.group_id). A group has any number
-- of managers, and a manager may run more than one group, so that is a table of its own. Being a manager gives no
-- rights yet. All of it is read and written through the admin-users function, so there are no policies.
create table public.recruiter_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create unique index recruiter_groups_name_idx on public.recruiter_groups (lower(btrim(name)));

alter table public.recruiter_groups enable row level security;

alter table public.profiles
  add column group_id uuid references public.recruiter_groups (id) on delete set null;

create index profiles_group_id_idx on public.profiles (group_id);

create table public.recruiter_group_managers (
  group_id uuid not null references public.recruiter_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (group_id, profile_id)
);

create index recruiter_group_managers_profile_idx on public.recruiter_group_managers (profile_id);

alter table public.recruiter_group_managers enable row level security;

-- The group can now be set with the other profile fields. p_set_group says whether to, since null means "no group".
-- Both are optional, so an admin-users function deployed before this keeps working.
drop function public.update_profile_as_admin(uuid, uuid, text, text, boolean, boolean);

create function public.update_profile_as_admin(
  p_actor uuid,
  p_profile_id uuid,
  p_wervernaam text,
  p_wervernr text,
  p_is_admin boolean,
  p_scan_contact_fields boolean default null,
  p_set_group boolean default false,
  p_group_id uuid default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('app.actor', p_actor::text, true);
  update public.profiles
     set wervernaam = p_wervernaam,
         wervernr = p_wervernr,
         is_admin = p_is_admin,
         scan_contact_fields = coalesce(p_scan_contact_fields, scan_contact_fields),
         group_id = case when p_set_group then p_group_id else group_id end
   where id = p_profile_id;
  if not found then
    raise exception 'Profile % not found', p_profile_id;
  end if;
end;
$$;

revoke execute on function public.update_profile_as_admin(uuid, uuid, text, text, boolean, boolean, boolean, uuid)
  from public, anon, authenticated;

-- Creates a group (p_group_id null) or changes one: its name, exactly these members and exactly these managers, all
-- at once. Someone added here leaves the group they were in. The audit log records the acting admin.
create function public.save_recruiter_group(
  p_actor uuid,
  p_group_id uuid,
  p_name text,
  p_members uuid[],
  p_managers uuid[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved uuid := p_group_id;
begin
  perform set_config('app.actor', p_actor::text, true);

  if saved is null then
    insert into public.recruiter_groups (name) values (btrim(p_name)) returning id into saved;
  else
    update public.recruiter_groups set name = btrim(p_name) where id = saved;
    if not found then
      raise exception 'Group % not found', saved using errcode = 'P0002';
    end if;
  end if;

  update public.profiles set group_id = null where group_id = saved and not (id = any (p_members));
  update public.profiles set group_id = saved where id = any (p_members) and group_id is distinct from saved;

  delete from public.recruiter_group_managers where group_id = saved and not (profile_id = any (p_managers));
  insert into public.recruiter_group_managers (group_id, profile_id)
    select saved, manager from unnest(p_managers) as manager
    on conflict do nothing;

  return saved;
end;
$$;

revoke execute on function public.save_recruiter_group(uuid, uuid, text, uuid[], uuid[])
  from public, anon, authenticated;

-- Deletes a group. Its wervers stay, without a group; the audit log records that under the acting admin.
create function public.delete_recruiter_group(p_actor uuid, p_group_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('app.actor', p_actor::text, true);
  delete from public.recruiter_groups where id = p_group_id;
end;
$$;

revoke execute on function public.delete_recruiter_group(uuid, uuid) from public, anon, authenticated;
