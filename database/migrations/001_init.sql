-- PennyPal schema (MySQL 8). All money is DECIMAL(12,2); XP is a separate integer.
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nickname VARCHAR(32) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('student','admin') NOT NULL DEFAULT 'student',
  avatar VARCHAR(32) NOT NULL DEFAULT 'penny',
  xp INT UNSIGNED NOT NULL DEFAULT 0,
  streak_days INT UNSIGNED NOT NULL DEFAULT 0,
  last_active DATE NULL,
  animations_on TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT chk_balance CHECK (balance >= 0),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT UNSIGNED NOT NULL,
  type ENUM('deposit','withdraw','goal_contribution') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(24) NOT NULL DEFAULT 'Other',
  description VARCHAR(120) NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  idempotency_key CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_amount CHECK (amount > 0),
  UNIQUE KEY uq_idem (account_id, idempotency_key),
  KEY idx_acct_time (account_id, created_at),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE savings_goals (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(60) NOT NULL,
  icon VARCHAR(24) NOT NULL DEFAULT 'jar',
  target DECIMAL(12,2) NOT NULL,
  saved DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  completed_at TIMESTAMP NULL,
  CONSTRAINT chk_target CHECK (target > 0),
  CONSTRAINT chk_saved CHECK (saved >= 0 AND saved <= target),
  KEY idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE savings_contributions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goal_id BIGINT UNSIGNED NOT NULL,
  transaction_id BIGINT UNSIGNED NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
) ENGINE=InnoDB;

CREATE TABLE budgets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uq_user_month (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE budget_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  budget_id BIGINT UNSIGNED NOT NULL,
  category ENUM('Food','Games','Education','Shopping','Savings','Other') NOT NULL,
  allocated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  UNIQUE KEY uq_cat (budget_id, category),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE quizzes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(40) NOT NULL,
  title VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE quiz_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT UNSIGNED NOT NULL,
  prompt VARCHAR(255) NOT NULL,
  options JSON NOT NULL,
  correct_index TINYINT UNSIGNED NOT NULL,
  explanation VARCHAR(255) NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE quiz_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  quiz_id INT UNSIGNED NOT NULL,
  score TINYINT UNSIGNED NOT NULL,
  total TINYINT UNSIGNED NOT NULL,
  xp_awarded INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_quiz (user_id, quiz_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
) ENGINE=InnoDB;

CREATE TABLE achievements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(48) NOT NULL,
  description VARCHAR(140) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE user_achievements (
  user_id BIGINT UNSIGNED NOT NULL,
  achievement_id INT UNSIGNED NOT NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
) ENGINE=InnoDB;

CREATE TABLE xp_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
