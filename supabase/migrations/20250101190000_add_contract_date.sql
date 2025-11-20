-- Migration: Add contract_date field to projects table
-- This migration adds a contract_date field to store the contract signing date

-- Add contract_date column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS contract_date date;

-- Add comment to the column
COMMENT ON COLUMN public.projects.contract_date IS 'Дата подписания договора';

-- Update existing projects to have NULL contract_date (they can be updated later)
-- No need to set default values as the field is nullable



















