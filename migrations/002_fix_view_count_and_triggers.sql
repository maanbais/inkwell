-- Migration: Fix view count trigger side effects and increment_view_count RPC
-- Run this on your Supabase (Postgres) instance via the SQL Editor.

-- =====================================================================
-- STEP 1: Create public.post_views table with composite primary key
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.post_views (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
  -- Composite primary key ensures one user = one view per post, forever.
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own view logs
DROP POLICY IF EXISTS "Users can insert own views" ON public.post_views;
CREATE POLICY "Users can insert own views"
ON public.post_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own view records
-- This is CRITICAL: without a SELECT policy, the EXISTS check inside
-- the RPC function would return no rows (RLS blocks reads), causing
-- the view count to increment on every refresh.
DROP POLICY IF EXISTS "Users can read own views" ON public.post_views;
CREATE POLICY "Users can read own views"
ON public.post_views FOR SELECT
TO authenticated
USING (auth.uid() = user_id);


-- =====================================================================
-- STEP 2: Update/Create Trigger Function for blogs updated_at
--
-- We ensure updated_at ONLY updates when actual content columns change.
-- It will NOT trigger when views, likes, or comments counts change.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.title IS DISTINCT FROM NEW.title OR
      OLD.subtitle IS DISTINCT FROM NEW.subtitle OR
      OLD.slug IS DISTINCT FROM NEW.slug OR
      OLD.excerpt IS DISTINCT FROM NEW.excerpt OR
      OLD.content IS DISTINCT FROM NEW.content OR
      OLD.cover_image IS DISTINCT FROM NEW.cover_image OR
      OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.updated_at = now();
  ELSE
    -- Keep the existing updated_at value if only non-content fields (like views) changed
    NEW.updated_at = OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- STEP 3: Replace increment_view_count RPC function
--
-- Ensure the RPC only increments views and tracks the view in the
-- post_views table for deduplication, running as SECURITY DEFINER
-- so RLS does not block check queries.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.increment_view_count(blog_id UUID)
RETURNS void AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  -- Only proceed if user is logged in
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Only increment if this user has NEVER viewed this post before
  IF NOT EXISTS (
    SELECT 1 FROM public.post_views
    WHERE user_id = current_user_id
    AND post_id = blog_id
  ) THEN
    UPDATE public.blogs 
    SET views = views + 1 
    WHERE id = blog_id;

    INSERT INTO public.post_views (user_id, post_id)
    VALUES (current_user_id, blog_id)
    ON CONFLICT (user_id, post_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
