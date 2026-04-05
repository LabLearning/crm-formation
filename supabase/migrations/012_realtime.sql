-- Migration 012 — Enable Supabase Realtime on notifications table
-- Run this in the Supabase SQL editor if not already done

-- Add notifications table to the realtime publication
-- so that postgres_changes events are broadcast to clients
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
