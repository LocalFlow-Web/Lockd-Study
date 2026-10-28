-- Lockd Study database
-- Paste this whole file into Supabase: SQL Editor → New query → Run.
-- Safe to run more than once.

-- ─────────────────────────────────────────────────────────────
-- Profiles: one row per user. "plan" decides the upload limit.
-- Users can read their own plan but never change it; the future
-- $5/month subscription will set it from the server.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

-- Make a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for anyone who signed up before this file was run.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Classes and study sets: each user sees and edits only their own.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.classes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.study_sets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  class_id text not null,
  data jsonb not null, -- notes, flashcards, quiz, progress
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.classes enable row level security;
alter table public.study_sets enable row level security;

drop policy if exists "Users manage their own classes" on public.classes;
create policy "Users manage their own classes" on public.classes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own study sets" on public.study_sets;
create policy "Users manage their own study sets" on public.study_sets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- Uploads: one row per lecture processed, used for the daily limit
-- and to track cost. Users can read their own rows but can't write
-- them directly; only the two functions below can.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.uploads (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  file_name text,
  model text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists uploads_user_recent on public.uploads (user_id, created_at desc);

alter table public.uploads enable row level security;

drop policy if exists "Users read their own uploads" on public.uploads;
create policy "Users read their own uploads" on public.uploads
  for select to authenticated using ((select auth.uid()) = user_id);

-- Reserve one upload, or return null if the user is at their limit.
-- Counts pending + finished uploads from the last 24 hours. Pro users
-- have no limit. The lock stops someone firing many uploads at once
-- to slip past the count.
create or replace function public.claim_upload(daily_limit integer, file_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  used integer;
  new_id bigint;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  if coalesce((select plan from public.profiles where id = uid), 'free') <> 'pro' then
    select count(*) into used
    from public.uploads
    where user_id = uid
      and status <> 'failed'
      and created_at > now() - interval '24 hours';

    if used >= daily_limit then
      return null;
    end if;
  end if;

  insert into public.uploads (user_id, file_name)
  values (uid, left(claim_upload.file_name, 300))
  returning id into new_id;

  return new_id;
end;
$$;

-- Mark a reserved upload as done (with its cost) or failed (so it
-- doesn't count against the limit). Only works once, on the caller's
-- own pending upload.
create or replace function public.finish_upload(
  upload_id bigint,
  succeeded boolean,
  model text default null,
  input_tokens integer default null,
  output_tokens integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.uploads u
  set status = case when succeeded then 'done' else 'failed' end,
      model = finish_upload.model,
      input_tokens = finish_upload.input_tokens,
      output_tokens = finish_upload.output_tokens
  where u.id = upload_id
    and u.user_id = auth.uid()
    and u.status = 'pending';
end;
$$;

revoke all on function public.claim_upload(integer, text) from public, anon;
revoke all on function public.finish_upload(bigint, boolean, text, integer, integer) from public, anon;
grant execute on function public.claim_upload(integer, text) to authenticated;
grant execute on function public.finish_upload(bigint, boolean, text, integer, integer) to authenticated;
