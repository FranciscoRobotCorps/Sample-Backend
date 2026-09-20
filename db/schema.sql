-- MariaDB schema for hermes-api
-- Run with: mariadb -u root < db/schema.sql

CREATE DATABASE IF NOT EXISTS hermes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hermes;

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
