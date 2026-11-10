-- Fashion Studio foundation schema for Supabase project Bouncy.
-- All exposed tables use RLS and explicit grants. Never expose service_role keys in clients.

create table if not exists public.fashion_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text,
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fashion_garments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('T-shirt','Hoodie','Jacket','Dress','Pants','Skirt','Shirt')),
  description text not null default '',
  model_path text,
  thumbnail_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fashion_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  garment_id uuid references public.fashion_garments(id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  category text not null default 'T-shirt',
  color text not null default '#eee9df',
  material text not null default 'Cotton',
  status text not null default 'draft' check (status in ('draft','published')),
  preview_url text,
  model_path text,
  settings jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fashion_design_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid not null references public.fashion_designs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, design_id)
);

create table if not exists public.fashion_design_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid not null references public.fashion_designs(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.fashion_designer_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint fashion_no_self_follow check (follower_id <> following_id)
);

create index if not exists fashion_designs_feed_idx on public.fashion_designs (status, published_at desc);
create index if not exists fashion_designs_owner_idx on public.fashion_designs (user_id, updated_at desc);
create index if not exists fashion_comments_design_idx on public.fashion_design_comments (design_id, created_at desc);
create index if not exists fashion_follows_following_idx on public.fashion_designer_follows (following_id);
create index if not exists fashion_designs_garment_idx on public.fashion_designs (garment_id);
create index if not exists fashion_likes_design_idx on public.fashion_design_likes (design_id);
create index if not exists fashion_comments_user_idx on public.fashion_design_comments (user_id);

alter table public.fashion_profiles enable row level security;
alter table public.fashion_garments enable row level security;
alter table public.fashion_designs enable row level security;
alter table public.fashion_design_likes enable row level security;
alter table public.fashion_design_comments enable row level security;
alter table public.fashion_designer_follows enable row level security;

drop policy if exists "Fashion profiles are public" on public.fashion_profiles;
create policy "Fashion profiles are public" on public.fashion_profiles
  for select to anon, authenticated using (true);
drop policy if exists "Designers create their own profile" on public.fashion_profiles;
create policy "Designers create their own profile" on public.fashion_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Designers update their own profile" on public.fashion_profiles;
create policy "Designers update their own profile" on public.fashion_profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Active garment catalogue is public" on public.fashion_garments;
create policy "Active garment catalogue is public" on public.fashion_garments
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Published designs and own drafts are visible" on public.fashion_designs;
create policy "Published designs and own drafts are visible" on public.fashion_designs
  for select to anon, authenticated using (status = 'published' or (select auth.uid()) = user_id);
drop policy if exists "Designers create their own designs" on public.fashion_designs;
create policy "Designers create their own designs" on public.fashion_designs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Designers update their own designs" on public.fashion_designs;
create policy "Designers update their own designs" on public.fashion_designs
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Designers delete their own designs" on public.fashion_designs;
create policy "Designers delete their own designs" on public.fashion_designs
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Likes are publicly readable" on public.fashion_design_likes;
create policy "Likes are publicly readable" on public.fashion_design_likes
  for select to anon, authenticated using (true);
drop policy if exists "Signed-in designers like published designs" on public.fashion_design_likes;
create policy "Signed-in designers like published designs" on public.fashion_design_likes
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.fashion_designs d where d.id = design_id and d.status = 'published'
    )
  );
drop policy if exists "Designers remove their own likes" on public.fashion_design_likes;
create policy "Designers remove their own likes" on public.fashion_design_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Comments on published designs are public" on public.fashion_design_comments;
create policy "Comments on published designs are public" on public.fashion_design_comments
  for select to anon, authenticated using (
    exists (select 1 from public.fashion_designs d where d.id = design_id and d.status = 'published')
  );
drop policy if exists "Signed-in designers comment on published designs" on public.fashion_design_comments;
create policy "Signed-in designers comment on published designs" on public.fashion_design_comments
  for insert to authenticated with check (
    (select auth.uid()) = user_id and exists (
      select 1 from public.fashion_designs d where d.id = design_id and d.status = 'published'
    )
  );
drop policy if exists "Designers delete their own comments" on public.fashion_design_comments;
create policy "Designers delete their own comments" on public.fashion_design_comments
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Designer follows are publicly readable" on public.fashion_designer_follows;
create policy "Designer follows are publicly readable" on public.fashion_designer_follows
  for select to anon, authenticated using (true);
drop policy if exists "Designers follow from their own account" on public.fashion_designer_follows;
create policy "Designers follow from their own account" on public.fashion_designer_follows
  for insert to authenticated with check ((select auth.uid()) = follower_id);
drop policy if exists "Designers unfollow from their own account" on public.fashion_designer_follows;
create policy "Designers unfollow from their own account" on public.fashion_designer_follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

grant usage on schema public to anon, authenticated;
grant select on public.fashion_profiles, public.fashion_garments, public.fashion_designs,
  public.fashion_design_likes, public.fashion_design_comments, public.fashion_designer_follows to anon;
grant select, insert, update, delete on public.fashion_profiles, public.fashion_designs,
  public.fashion_design_likes, public.fashion_design_comments, public.fashion_designer_follows to authenticated;
grant select on public.fashion_garments to authenticated;

insert into public.fashion_garments (slug, name, category, description)
values
  ('classic-tee', 'Classic T-shirt', 'T-shirt', 'A clean everyday tee blockout'),
  ('oversized-hoodie', 'Oversized Hoodie', 'Hoodie', 'A relaxed streetwear hoodie blockout'),
  ('utility-jacket', 'Utility Jacket', 'Jacket', 'A structured jacket blockout'),
  ('studio-dress', 'Studio Dress', 'Dress', 'A simple dress blockout'),
  ('straight-pants', 'Straight Pants', 'Pants', 'A straight-leg trouser blockout')
on conflict (slug) do nothing;
