-- Create the main database
CREATE DATABASE IF NOT EXISTS health;
USE health;

-- ============================
-- USERS TABLE
-- Stores both admin and patients
-- ============================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'patient') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================
-- SLOTS TABLE
-- Stores all appointment slots created by admin
-- ============================

CREATE TABLE slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('available', 'taken') DEFAULT 'available'
);

-- ============================
-- APPOINTMENTS TABLE
-- Stores all patient bookings
-- ============================

CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  slot_id INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_slot
    FOREIGN KEY (slot_id)
    REFERENCES slots(id)
    ON DELETE CASCADE,

  CONSTRAINT unique_slot_booking UNIQUE (slot_id)
);

-- Create app user and grant privileges
CREATE USER IF NOT EXISTS 'health_app'@'localhost' IDENTIFIED BY 'qwertyuiop';
GRANT ALL PRIVILEGES ON health.* TO 'health_app'@'localhost';
FLUSH PRIVILEGES;