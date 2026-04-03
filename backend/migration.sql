CREATE DATABASE IF NOT EXISTS `lab_data_craft`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lab_data_craft`;

SET FOREIGN_KEY_CHECKS = 0;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for session persistence
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` VARCHAR(255) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_session_id` (`session_id`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `client_name` VARCHAR(255) DEFAULT NULL,
  `project_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_user_id` (`user_id`),
  CONSTRAINT `fk_projects_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `test_definitions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `test_key` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` ENUM('soil', 'concrete', 'rock', 'special') NOT NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_test_definitions_test_key` (`test_key`),
  KEY `idx_test_definitions_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `test_results` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `project_id` INT UNSIGNED DEFAULT NULL,
  `test_key` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` ENUM('soil', 'concrete', 'rock', 'special') NOT NULL,
  `status` ENUM('not-started', 'in-progress', 'completed') NOT NULL DEFAULT 'not-started',
  `data_points` INT UNSIGNED NOT NULL DEFAULT 0,
  `key_results_json` LONGTEXT NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_test_results_user_id` (`user_id`),
  KEY `idx_test_results_project_id` (`project_id`),
  KEY `idx_test_results_test_key` (`test_key`),
  KEY `idx_test_results_category` (`category`),
  CONSTRAINT `fk_test_results_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_test_results_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `atterberg_instances` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `borehole_id` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_atterberg_project_borehole` (`project_id`, `borehole_id`),
  KEY `idx_atterberg_project_id` (`project_id`),
  CONSTRAINT `fk_atterberg_instances_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `atterberg_rows` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `atterberg_instance_id` INT UNSIGNED NOT NULL,
  `depth` DECIMAL(10, 2) DEFAULT NULL,
  `ll` DECIMAL(10, 2) DEFAULT NULL,
  `pl` DECIMAL(10, 2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_atterberg_rows_instance_id` (`atterberg_instance_id`),
  CONSTRAINT `fk_atterberg_rows_instance`
    FOREIGN KEY (`atterberg_instance_id`) REFERENCES `atterberg_instances` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `test_definitions` (`test_key`, `name`, `category`, `sort_order`) VALUES
  ('grading', 'Grading (Sieve Analysis)', 'soil', 1),
  ('atterberg', 'Atterberg Limits', 'soil', 2),
  ('proctor', 'Proctor Test', 'soil', 3),
  ('cbr', 'CBR', 'soil', 4),
  ('shear', 'Shear Test', 'soil', 5),
  ('consolidation', 'Consolidation', 'soil', 6),
  ('slump', 'Slump Test', 'concrete', 7),
  ('compressive', 'Compressive Strength', 'concrete', 8),
  ('ucs', 'UCS', 'rock', 9),
  ('pointload', 'Point Load', 'rock', 10),
  ('porosity', 'Porosity', 'rock', 11),
  ('spt', 'SPT', 'special', 12),
  ('dcp', 'DCP', 'special', 13);

SET FOREIGN_KEY_CHECKS = 1;
