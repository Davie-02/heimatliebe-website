-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Add 'is_read' to Notifications
-- Run in Supabase SQL editor.
--
-- This script adds a boolean column to the notifications table
-- to track whether a notification has been read by the user.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

SELECT 'is_read column added to notifications table.' as result;