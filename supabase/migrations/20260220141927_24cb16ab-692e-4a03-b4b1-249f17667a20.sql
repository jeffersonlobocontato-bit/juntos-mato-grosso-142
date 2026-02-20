
-- Step 1: Add new enum value
ALTER TYPE public.proposal_status ADD VALUE IF NOT EXISTS 'em_analise';
