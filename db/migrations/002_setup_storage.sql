-- ═══════════════════════════════════════════════════════════════
-- HEIMATLIEBE INSTITUTE — Supabase Storage Bucket Setup
-- Run this in Supabase SQL Editor AFTER the schema migration.
--
-- Creates storage buckets for:
--   - payment-proofs   (student payment uploads)
--   - library-files    (admin-uploaded PDFs, EPUBs, etc.)
--   - library-covers   (book cover thumbnails)
--   - uploads          (generic file uploads from CMS)
--   - avatars          (user profile photos)
-- ═══════════════════════════════════════════════════════════════

-- Create storage buckets (idempotent — safe to re-run)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES
  ('payment-proofs', 'payment-proofs', true, false, 5242880, '{image/png,image/jpeg,image/jpg,application/pdf}'),
  ('library-files',  'library-files',  true, false, 52428800, '{application/pdf,application/epub+zip,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain}'),
  ('library-covers', 'library-covers', true, false, 2097152, '{image/png,image/jpeg,image/jpg,image/webp}'),
  ('uploads',        'uploads',        true, false, 104857600, '{image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf,application/epub+zip,application/zip}'),
  ('avatars',        'avatars',        true, false, 1048576, '{image/png,image/jpeg,image/jpg,image/webp}')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- If the storage extension isn't enabled, enable it:
-- CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "storage";
-- ═══════════════════════════════════════════════════════════════

SELECT 'Storage buckets configured successfully' AS result;
