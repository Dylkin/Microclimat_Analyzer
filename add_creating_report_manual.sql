-- Manual SQL script to add 'creating_report' to project_status enum
-- Execute this in Supabase SQL Editor

ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'creating_report';




















