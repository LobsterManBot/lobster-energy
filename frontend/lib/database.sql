-- Run this in Supabase SQL Editor

-- Users table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  company text,
  subscription_tier text default 'free', -- 'free', 'pro', 'enterprise'
  subscription_status text default 'active', -- 'active', 'cancelled', 'past_due'
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Usage tracking (optional, for analytics)
create table public.api_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  endpoint text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.api_usage enable row level security;

create policy "Users can view own usage" on public.api_usage
  for select using (auth.uid() = user_id);
