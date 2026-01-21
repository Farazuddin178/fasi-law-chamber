-- Fix for task_comments and task_responses tables
-- Run this SQL in your Supabase SQL Editor

-- First, check if task_comments table exists, if not create it
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_responses table (for accept/pass on actions)
CREATE TABLE IF NOT EXISTS public.task_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    response_type TEXT NOT NULL CHECK (response_type IN ('accept', 'pass_on', 'reject')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_task_id ON public.task_responses(task_id);
CREATE INDEX IF NOT EXISTS idx_task_responses_user_id ON public.task_responses(user_id);

-- Enable RLS on task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can create task comments" ON public.task_comments;
DROP POLICY IF EXISTS "Users can update their own task comments" ON public.task_comments;

-- RLS policies for task_comments
CREATE POLICY "Users can view task comments"
ON public.task_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create task comments"
ON public.task_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task comments"
ON public.task_comments FOR UPDATE
USING (auth.uid() = user_id);

-- Enable RLS on task_responses
ALTER TABLE public.task_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view task responses" ON public.task_responses;
DROP POLICY IF EXISTS "Users can create task responses" ON public.task_responses;

-- RLS policies for task_responses
CREATE POLICY "Users can view task responses"
ON public.task_responses FOR SELECT
USING (true);

CREATE POLICY "Users can create task responses"
ON public.task_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add IA details, USR details, and other missing fields to cases table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS ia_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS usr_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS connected_matters TEXT,
ADD COLUMN IF NOT EXISTS vakalath_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS lower_court_details JSONB,
ADD COLUMN IF NOT EXISTS petitioners JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS respondents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS orders JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.cases.ia_details IS 'Array of IA entries: [{ia_number, filing_date, advocate_name, misc_paper_type, status, prayer, order_date, order}]';
COMMENT ON COLUMN public.cases.usr_details IS 'Array of USR entries: [{usr_number, advocate_name, usr_type, usr_filing_date, remarks}]';
COMMENT ON COLUMN public.cases.vakalath_details IS 'Array of Vakalath entries: [{advocate_code, advocate_name, p_r_no, remarks, file_url}]';
COMMENT ON COLUMN public.cases.lower_court_details IS 'Object: {court_name, district, lower_court_case_no, honorable_judge, date_of_judgement}';
COMMENT ON COLUMN public.cases.petitioners IS 'Array of petitioner entries: [{s_no, name}]';
COMMENT ON COLUMN public.cases.respondents IS 'Array of respondent entries: [{r_no, name}]';
COMMENT ON COLUMN public.cases.orders IS 'Array of order entries: [{order_on, judge_name, date, type, details, file_url}]';
