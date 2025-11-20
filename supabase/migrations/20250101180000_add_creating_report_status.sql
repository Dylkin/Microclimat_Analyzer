-- Migration: Add 'creating_report' status to project_status enum
-- This migration adds the new 'creating_report' status to the project_status enum

-- Add the new value to the enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'creating_report';

-- Verify the enum values
SELECT unnest(enum_range(NULL::project_status)) AS project_status_values;




















