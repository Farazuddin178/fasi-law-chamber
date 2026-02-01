#!/usr/bin/env python3
"""
Fix Supabase audit_logs trigger to prevent NULL changed_by errors
Run this to disable the auto-trigger that's causing the constraint violation
"""

from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY environment variables not set")
    print("Set them in your .env file and try again")
    exit(1)

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL to disable the problematic trigger
disable_trigger_sql = """
-- Disable ALL triggers on audit_logs to prevent auto-insertion
-- This allows the frontend to control all audit log creation

BEGIN;

-- Drop problematic triggers
DROP TRIGGER IF EXISTS audit_logs_trigger ON cases CASCADE;
DROP TRIGGER IF EXISTS audit_trigger ON cases CASCADE;
DROP TRIGGER IF EXISTS on_case_change ON cases CASCADE;
DROP TRIGGER IF EXISTS handle_audit_log_insert ON audit_logs CASCADE;

-- Drop trigger functions
DROP FUNCTION IF EXISTS create_audit_log_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_log_function() CASCADE;
DROP FUNCTION IF EXISTS handle_audit_insert() CASCADE;

COMMIT;

-- Verify audit_logs table structure is correct
-- The changed_by column should NOT be null
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' AND column_name = 'changed_by';
"""

print("=" * 60)
print("Supabase Audit Trigger Fix")
print("=" * 60)
print("\nTo fix the NULL changed_by constraint violation:")
print("\n1. Go to your Supabase dashboard")
print("2. Navigate to SQL Editor")
print("3. Create a new query")
print("4. Paste this SQL:\n")
print(disable_trigger_sql)
print("\n5. Run the query")
print("\n" + "=" * 60)
print("After applying the SQL fix:")
print("- Hard refresh your app (Ctrl+Shift+R or Cmd+Shift+R)")
print("- Try saving a case again")
print("- The error should be fixed!")
print("=" * 60)
