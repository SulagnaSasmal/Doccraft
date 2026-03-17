import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
};

export type CloudDocument = {
  id: string;
  user_id: string;
  title: string;
  config: Record<string, string>;
  content: string;
  created_at: string;
  updated_at: string;
  team_id?: string;
  is_shared: boolean;
};

export type Team = {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  email?: string;
  joined_at: string;
};

/**
 * Supabase schema (run in SQL editor):
 *
 * create table documents (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references auth.users not null,
 *   title text not null,
 *   config jsonb not null default '{}',
 *   content text not null default '',
 *   is_shared boolean not null default false,
 *   team_id uuid references teams(id),
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 * alter table documents enable row level security;
 * create policy "Users can manage own docs"
 *   on documents for all using (auth.uid() = user_id);
 *
 * create table teams (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   owner_id uuid references auth.users not null,
 *   invite_code text unique not null default substr(md5(random()::text), 1, 10),
 *   created_at timestamptz not null default now()
 * );
 * alter table teams enable row level security;
 * create policy "Team members can read teams"
 *   on teams for select using (
 *     auth.uid() = owner_id or
 *     exists (select 1 from team_members where team_id = teams.id and user_id = auth.uid())
 *   );
 *
 * create table team_members (
 *   id uuid primary key default gen_random_uuid(),
 *   team_id uuid references teams(id) on delete cascade,
 *   user_id uuid references auth.users not null,
 *   role text not null default 'editor',
 *   joined_at timestamptz not null default now(),
 *   unique(team_id, user_id)
 * );
 * alter table team_members enable row level security;
 * create policy "Team members can read team_members"
 *   on team_members for select using (
 *     exists (select 1 from team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid())
 *   );
 */
