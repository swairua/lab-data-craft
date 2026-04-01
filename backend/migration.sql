-- Lab Data Craft - MySQL Migration
-- Run this script to set up the database

CREATE DATABASE IF NOT EXISTS lab_data_craft;
USE lab_data_craft;

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) DEFAULT '',
    role ENUM('admin', 'user', 'viewer') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Session tokens (JWT alternative for server-side tracking)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) DEFAULT '',
    client VARCHAR(255) DEFAULT '',
    consultant VARCHAR(255) DEFAULT '',
    contractor VARCHAR(255) DEFAULT '',
    date DATE DEFAULT NULL,
    user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Boreholes table
CREATE TABLE IF NOT EXISTS boreholes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    depth DECIMAL(10,2) DEFAULT NULL,
    location VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tests table (now with optional borehole_id)
CREATE TABLE IF NOT EXISTS tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    borehole_id INT NULL,
    test_key VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category ENUM('soil', 'concrete', 'rock', 'special') NOT NULL,
    status ENUM('not-started', 'in-progress', 'completed') DEFAULT 'not-started',
    data_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (borehole_id) REFERENCES boreholes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_borehole_test (borehole_id, test_key)
);

-- Test results (key-value pairs per test)
CREATE TABLE IF NOT EXISTS test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id INT NOT NULL,
    label VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- Test data (raw input data stored as JSON per test)
CREATE TABLE IF NOT EXISTS test_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id INT NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
    UNIQUE KEY unique_test_field (test_id, field_name)
);

-- Seed default project with boreholes
INSERT INTO projects (name) VALUES ('Default Project');

-- Seed two default boreholes for the default project
INSERT INTO boreholes (project_id, name, depth, location) VALUES
(1, 'BH-1', 3.00, 'Chainage 0+100'),
(1, 'BH-2', 5.00, 'Chainage 0+200');

-- Seed default tests for each borehole
INSERT INTO tests (project_id, borehole_id, test_key, name, category) VALUES
-- BH-1 tests
(1, 1, 'grading', 'Grading (Sieve Analysis)', 'soil'),
(1, 1, 'atterberg', 'Atterberg Limits', 'soil'),
(1, 1, 'proctor', 'Proctor Test', 'soil'),
(1, 1, 'cbr', 'CBR', 'soil'),
(1, 1, 'shear', 'Shear Test', 'soil'),
(1, 1, 'consolidation', 'Consolidation', 'soil'),
(1, 1, 'slump', 'Slump Test', 'concrete'),
(1, 1, 'compressive', 'Compressive Strength', 'concrete'),
(1, 1, 'upvt', 'UPVT', 'concrete'),
(1, 1, 'schmidt', 'Schmidt Hammer', 'concrete'),
(1, 1, 'coring', 'Coring', 'concrete'),
(1, 1, 'cubes', 'Concrete Cubes', 'concrete'),
(1, 1, 'ucs', 'UCS', 'rock'),
(1, 1, 'pointload', 'Point Load', 'rock'),
(1, 1, 'porosity', 'Porosity', 'rock'),
(1, 1, 'spt', 'SPT', 'special'),
(1, 1, 'dcp', 'DCP', 'special'),
-- BH-2 tests
(1, 2, 'grading', 'Grading (Sieve Analysis)', 'soil'),
(1, 2, 'atterberg', 'Atterberg Limits', 'soil'),
(1, 2, 'proctor', 'Proctor Test', 'soil'),
(1, 2, 'cbr', 'CBR', 'soil'),
(1, 2, 'shear', 'Shear Test', 'soil'),
(1, 2, 'consolidation', 'Consolidation', 'soil'),
(1, 2, 'slump', 'Slump Test', 'concrete'),
(1, 2, 'compressive', 'Compressive Strength', 'concrete'),
(1, 2, 'upvt', 'UPVT', 'concrete'),
(1, 2, 'schmidt', 'Schmidt Hammer', 'concrete'),
(1, 2, 'coring', 'Coring', 'concrete'),
(1, 2, 'cubes', 'Concrete Cubes', 'concrete'),
(1, 2, 'ucs', 'UCS', 'rock'),
(1, 2, 'pointload', 'Point Load', 'rock'),
(1, 2, 'porosity', 'Porosity', 'rock'),
(1, 2, 'spt', 'SPT', 'special'),
(1, 2, 'dcp', 'DCP', 'special');
