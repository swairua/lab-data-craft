-- Create admin images table
CREATE TABLE IF NOT EXISTS admin_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  image_type ENUM('logo', 'contacts', 'stamp') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  mime_type VARCHAR(50) DEFAULT 'image/jpeg',
  uploaded_by INT UNSIGNED NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_image_type (image_type),
  INDEX idx_image_type (image_type),
  INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create audit log table (optional, for tracking image changes)
CREATE TABLE IF NOT EXISTS admin_images_audit (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_image_id INT UNSIGNED,
  action VARCHAR(50) NOT NULL,
  old_file_path VARCHAR(500),
  new_file_path VARCHAR(500),
  changed_by INT UNSIGNED NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_image_id) REFERENCES admin_images(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_image_id (admin_image_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
