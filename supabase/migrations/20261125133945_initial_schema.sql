-- Initial Supabase schema for the personal site.
-- Applied migration version: 20261125133945
-- Content is intentionally not seeded.

create table if not exists public.notes (
  id varchar(36) primary key default gen_random_uuid(),
  title varchar(200) not null,
  summary varchar(300) not null default '',
  content text not null default '',
  status varchar(20) not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_status_check check (status in ('draft', 'published'))
);

create index if not exists notes_status_published_idx
  on public.notes (status, published_at);
create index if not exists notes_status_idx
  on public.notes (status);

create table if not exists public.tags (
  id varchar(36) primary key default gen_random_uuid(),
  name varchar(50) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.note_tags (
  id varchar(36) primary key default gen_random_uuid(),
  note_id varchar(36) not null references public.notes(id) on delete cascade,
  tag_id varchar(36) not null references public.tags(id) on delete cascade,
  unique (note_id, tag_id)
);

create index if not exists note_tags_note_id_idx
  on public.note_tags (note_id);
create index if not exists note_tags_tag_id_idx
  on public.note_tags (tag_id);

create table if not exists public.works (
  id varchar(36) primary key default gen_random_uuid(),
  title varchar(200) not null,
  subtitle varchar(300) not null default '',
  cover_url text,
  content text not null default '',
  external_url text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint works_tags_array_check check (jsonb_typeof(tags) = 'array')
);

create index if not exists works_created_at_idx
  on public.works (created_at);

create table if not exists public.profile (
  id varchar(36) primary key default gen_random_uuid(),
  nickname varchar(50) not null default '枫',
  headline varchar(200) not null default '',
  bio text not null default '',
  avatar_url text,
  skills jsonb not null default '[]'::jsonb,
  contact jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint profile_skills_array_check check (jsonb_typeof(skills) = 'array'),
  constraint profile_contact_array_check check (jsonb_typeof(contact) = 'array')
);

create table if not exists public.messages (
  id varchar(36) primary key default gen_random_uuid(),
  name varchar(50) not null,
  content text not null,
  visitor_token varchar(64) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create index if not exists messages_visitor_token_idx
  on public.messages (visitor_token);
create index if not exists messages_created_at_idx
  on public.messages (created_at);
create index if not exists messages_deleted_at_idx
  on public.messages (deleted_at);

alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.works enable row level security;
alter table public.profile enable row level security;
alter table public.messages enable row level security;

alter table public.notes force row level security;
alter table public.tags force row level security;
alter table public.note_tags force row level security;
alter table public.works force row level security;
alter table public.profile force row level security;
alter table public.messages force row level security;

revoke all on table public.notes from anon, authenticated;
revoke all on table public.tags from anon, authenticated;
revoke all on table public.note_tags from anon, authenticated;
revoke all on table public.works from anon, authenticated;
revoke all on table public.profile from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select, insert, update, delete on table public.notes to service_role;
grant select, insert, update, delete on table public.tags to service_role;
grant select, insert, update, delete on table public.note_tags to service_role;
grant select, insert, update, delete on table public.works to service_role;
grant select, insert, update, delete on table public.profile to service_role;
grant select, insert, update, delete on table public.messages to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
