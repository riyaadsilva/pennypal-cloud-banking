-- Run once as a MySQL admin (local) or the RDS master user. Change the password first.
CREATE DATABASE IF NOT EXISTS pennypal CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS "pennypal"@"%" IDENTIFIED BY "change-me";
GRANT ALL PRIVILEGES ON pennypal.* TO "pennypal"@"%";
FLUSH PRIVILEGES;
