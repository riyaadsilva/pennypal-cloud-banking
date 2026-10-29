ALTER TABLE users
ADD COLUMN cognito_sub VARCHAR(64) NULL,
ADD UNIQUE KEY uq_users_cognito_sub (cognito_sub);
