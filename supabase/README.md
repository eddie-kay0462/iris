# Supabase Migrations

This folder contains database migrations managed by the Supabase CLI.

## Setup (One-time)

### 1. Login to Supabase CLI

```bash
npx supabase login
```

This opens a browser to authenticate with your Supabase account.

### 2. Link to your project

```bash
npx supabase link --project-ref krnnifoypyilajatsmva
```

You'll be prompted for your database password. Find it in:
Supabase Dashboard → Project Settings → Database → Connection string → Password

## Running Migrations

### Push migrations to remote database

```bash
npx supabase db push
```

### Check what would be applied (dry run)

```bash
npx supabase db push --dry-run
```

### Create a new migration

```bash
npx supabase migration new my_migration_name
```

This creates a timestamped file in `supabase/migrations/`.

## CI/CD

For automated deployments, set the `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` environment variables:

```bash
export SUPABASE_ACCESS_TOKEN=your_access_token
export SUPABASE_DB_PASSWORD=your_db_password
npx supabase db push
```

## Current Migrations

| Timestamp | Name | Description |
|-----------|------|-------------|
| 20260211142335 | add_profile_insert_policy | Allows users to create their own profile during signup |
