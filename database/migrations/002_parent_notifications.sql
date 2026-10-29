CREATE TABLE parent_notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id BIGINT UNSIGNED NOT NULL,
    parent_email VARCHAR(254) NOT NULL,
    sns_subscription_arn VARCHAR(512) DEFAULT NULL,
    verification_status ENUM('pending', 'confirmed', 'disabled')
        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_parent_student (student_id),
    CONSTRAINT fk_parent_notifications_student
        FOREIGN KEY (student_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
