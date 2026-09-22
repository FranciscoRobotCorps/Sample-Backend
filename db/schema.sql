-- MariaDB schema for hermes-api
-- Run with: mariadb -u root < db/schema.sql

CREATE DATABASE IF NOT EXISTS hermes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hermes;

-- Users table (credentials stored in DB instead of hardcoded)
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  email       VARCHAR(255)     NOT NULL,
  password_hash VARCHAR(60)    NOT NULL, -- bcrypt hash (always 60 chars)
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Insert default user: email=user@example.com, password=password123
INSERT IGNORE INTO users (email, password_hash) VALUES
  ('user@example.com', '$2b$10$7a8F7dT2CPGnjPfwH54n.uQYO8w9KKEaFjj9QzWkWlKgFRnSKV7n6');

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255)     NOT NULL,
  description VARCHAR(1024)    NULL,
  done        TINYINT(1)       NOT NULL DEFAULT 0,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Dedicated app user with access from any host and localhost:
CREATE USER IF NOT EXISTS 'hermes'@'%' IDENTIFIED BY 'hermes';
GRANT SELECT, INSERT, UPDATE, DELETE ON hermes.* TO 'hermes'@'%';

CREATE USER IF NOT EXISTS 'hermes'@'localhost' IDENTIFIED BY 'hermes';
GRANT SELECT, INSERT, UPDATE, DELETE ON hermes.* TO 'hermes'@'localhost';

FLUSH PRIVILEGES;
