-- ============================================================================
-- ADMIN IMAGES - SQL QUERIES FOR UPLOAD AND MANAGEMENT
-- ============================================================================

-- ============================================================================
-- 1. INSERT QUERIES (for uploading new images)
-- ============================================================================

-- Insert a new admin image (called after successful file upload)
INSERT INTO admin_images 
(image_type, file_path, original_filename, file_size, mime_type, uploaded_by)
VALUES 
(:image_type, :file_path, :original_filename, :file_size, :mime_type, :user_id);

-- Example with actual values:
-- INSERT INTO admin_images 
-- (image_type, file_path, original_filename, file_size, mime_type, uploaded_by)
-- VALUES 
-- ('logo', '/uploads/admin/logo/logo_20240115_abc123.png', 'logo.png', 45678, 'image/png', 1);


-- ============================================================================
-- 2. SELECT QUERIES (for retrieving uploaded images)
-- ============================================================================

-- Get the current logo image
SELECT 
  id, 
  file_path, 
  original_filename, 
  file_size, 
  mime_type, 
  uploaded_at 
FROM admin_images 
WHERE image_type = 'logo' 
ORDER BY uploaded_at DESC 
LIMIT 1;

-- Get the current contacts image
SELECT 
  id, 
  file_path, 
  original_filename, 
  file_size, 
  mime_type, 
  uploaded_at 
FROM admin_images 
WHERE image_type = 'contacts' 
ORDER BY uploaded_at DESC 
LIMIT 1;

-- Get the current stamp image
SELECT 
  id, 
  file_path, 
  original_filename, 
  file_size, 
  mime_type, 
  uploaded_at 
FROM admin_images 
WHERE image_type = 'stamp' 
ORDER BY uploaded_at DESC 
LIMIT 1;

-- Get all admin images (all types)
SELECT 
  id, 
  image_type, 
  file_path, 
  original_filename, 
  file_size, 
  mime_type, 
  u.name as uploaded_by_name,
  u.email as uploaded_by_email,
  uploaded_at,
  updated_at
FROM admin_images
LEFT JOIN users u ON admin_images.uploaded_by = u.id
ORDER BY uploaded_at DESC;

-- Get all uploaded images by image type
SELECT 
  id, 
  image_type, 
  file_path, 
  original_filename, 
  file_size, 
  uploaded_at 
FROM admin_images 
WHERE image_type IN ('logo', 'contacts', 'stamp')
ORDER BY image_type, uploaded_at DESC;

-- Get upload history for a specific image type
SELECT 
  id, 
  file_path, 
  original_filename, 
  file_size, 
  u.name as uploaded_by_name,
  uploaded_at 
FROM admin_images
LEFT JOIN users u ON admin_images.uploaded_by = u.id
WHERE image_type = :image_type 
ORDER BY uploaded_at DESC;

-- Get latest image file paths (one per type - useful for displaying)
SELECT 
  image_type, 
  file_path, 
  original_filename, 
  uploaded_at 
FROM admin_images 
WHERE (image_type, uploaded_at) IN (
  SELECT image_type, MAX(uploaded_at)
  FROM admin_images
  GROUP BY image_type
);


-- ============================================================================
-- 3. UPDATE QUERIES (for modifying existing records)
-- ============================================================================

-- Update file path (if you need to reorganize uploaded files)
UPDATE admin_images 
SET file_path = :new_file_path, updated_at = CURRENT_TIMESTAMP
WHERE id = :image_id;

-- Mark image as archived/inactive (without deleting)
ALTER TABLE admin_images ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE admin_images 
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE id = :image_id;


-- ============================================================================
-- 4. DELETE QUERIES (for removing images)
-- ============================================================================

-- Delete a specific image by ID
DELETE FROM admin_images 
WHERE id = :image_id;

-- Delete all images of a specific type (use with caution!)
DELETE FROM admin_images 
WHERE image_type = :image_type;

-- Delete images older than X days (keep only recent)
DELETE FROM admin_images 
WHERE uploaded_at < DATE_SUB(NOW(), INTERVAL 90 DAY);


-- ============================================================================
-- 5. AUDIT LOG QUERIES
-- ============================================================================

-- Log an image replacement (when uploading a new version)
INSERT INTO admin_images_audit 
(admin_image_id, action, old_file_path, new_file_path, changed_by)
VALUES 
(:image_id, 'replace', :old_file_path, :new_file_path, :user_id);

-- Get audit history for an image
SELECT 
  a.id,
  a.action,
  a.old_file_path,
  a.new_file_path,
  u.name as changed_by_name,
  u.email as changed_by_email,
  a.changed_at
FROM admin_images_audit a
LEFT JOIN users u ON a.changed_by = u.id
WHERE a.admin_image_id = :image_id
ORDER BY a.changed_at DESC;

-- Get all audit changes
SELECT 
  a.id,
  ai.image_type,
  a.action,
  u.name as changed_by_name,
  a.changed_at
FROM admin_images_audit a
LEFT JOIN admin_images ai ON a.admin_image_id = ai.id
LEFT JOIN users u ON a.changed_by = u.id
ORDER BY a.changed_at DESC;


-- ============================================================================
-- 6. USEFUL STATISTICS & ADMIN QUERIES
-- ============================================================================

-- Get file size statistics
SELECT 
  image_type,
  COUNT(*) as upload_count,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size) / 1024 / 1024, 2) as total_size_mb,
  MAX(uploaded_at) as last_upload
FROM admin_images
GROUP BY image_type;

-- Find duplicate uploads (same image_type, multiple recent versions)
SELECT 
  image_type,
  COUNT(*) as version_count,
  GROUP_CONCAT(id ORDER BY uploaded_at DESC) as all_ids,
  MAX(uploaded_at) as latest_upload
FROM admin_images
GROUP BY image_type
HAVING version_count > 1;

-- Get all uploads in the last 30 days
SELECT 
  id,
  image_type,
  original_filename,
  file_size,
  u.name as uploaded_by,
  uploaded_at
FROM admin_images
LEFT JOIN users u ON admin_images.uploaded_by = u.id
WHERE uploaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY uploaded_at DESC;

-- Find largest uploaded files
SELECT 
  image_type,
  original_filename,
  ROUND(file_size / 1024 / 1024, 2) as size_mb,
  uploaded_at
FROM admin_images
ORDER BY file_size DESC
LIMIT 10;


-- ============================================================================
-- 7. HELPER QUERIES FOR FRONTEND API
-- ============================================================================

-- Get image paths for all three types (useful for rendering)
SELECT 
  MAX(CASE WHEN image_type = 'logo' THEN file_path END) as logo_path,
  MAX(CASE WHEN image_type = 'contacts' THEN file_path END) as contacts_path,
  MAX(CASE WHEN image_type = 'stamp' THEN file_path END) as stamp_path
FROM (
  SELECT image_type, file_path, uploaded_at
  FROM admin_images
  WHERE (image_type, uploaded_at) IN (
    SELECT image_type, MAX(uploaded_at)
    FROM admin_images
    GROUP BY image_type
  )
) latest_images;

-- Get image info by type with upload user details
SELECT 
  ai.image_type,
  ai.file_path,
  ai.original_filename,
  ROUND(ai.file_size / 1024, 2) as size_kb,
  ai.mime_type,
  u.name as uploaded_by_name,
  u.email as uploaded_by_email,
  ai.uploaded_at,
  TIMESTAMPDIFF(HOUR, ai.uploaded_at, NOW()) as hours_since_upload
FROM admin_images ai
LEFT JOIN users u ON ai.uploaded_by = u.id
WHERE (ai.image_type, ai.uploaded_at) IN (
  SELECT image_type, MAX(uploaded_at)
  FROM admin_images
  GROUP BY image_type
)
ORDER BY ai.image_type;
