-- Migration: Add admin roles (staff, manager, admin) and customer tiers (waitlist, inner_circle) to user_role enum
-- The user_role enum may have been created with only customer tiers (public, waitlist, inner_circle)
-- or with admin roles (public, admin, manager, staff). This migration ensures all required values exist.
-- IF NOT EXISTS makes the migration idempotent (safe to run multiple times). Requires PostgreSQL 15+.

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'waitlist';
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'inner_circle';
