-- Migration: Add INSERT policy for profiles table
-- This allows authenticated users to create their own profile during signup.
-- Without this policy, new users cannot create their profile record.

-- Add INSERT policy for profiles
-- Users can only insert a profile with their own auth.uid() as the id
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
