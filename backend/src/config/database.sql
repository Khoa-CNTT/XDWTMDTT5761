-- Create database
CREATE DATABASE IF NOT EXISTS multimart_db;
USE multimart_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    fullName VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('user', 'vendor', 'admin') DEFAULT 'user',
    provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    providerId VARCHAR(255),
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status)
); 