-- Migration: create blogs table
-- Run this on your Supabase (Postgres) instance. Do NOT run from the app.

CREATE TYPE IF NOT EXISTS public.blog_status AS ENUM ('draft', 'published');

CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image text,
  status public.blog_status NOT NULL DEFAULT 'draft',
  views integer NOT NULL DEFAULT 0,
  reading_time integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blogs are readable by everyone"
ON public.blogs
FOR SELECT
USING (status = 'published');

CREATE POLICY "Authors can insert their own blogs"
ON public.blogs
FOR INSERT
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can update their own blogs"
ON public.blogs
FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete their own blogs"
ON public.blogs
FOR DELETE
USING (author_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON public.blogs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON public.blogs (author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON public.blogs (status);
