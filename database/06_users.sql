-- =====================================================================
-- 06_users.sql — Login accounts (added on top of the existing schema)
-- Run this AFTER 01_schema.sql through 05_sample_data.sql.
-- Does not modify any existing table.
-- =====================================================================
USE resqdb;

CREATE TABLE Users (
    user_id         VARCHAR(50) PRIMARY KEY,     -- chosen login username
    password_hash   VARCHAR(255) NOT NULL,       -- salted hash, never a plain password
    account_type    ENUM('Organization','Individual') NOT NULL,
    organization_id INT NULL,                    -- set only for Organization accounts
    display_name    VARCHAR(150) NOT NULL,        -- org name, or the donor's own name
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id),
    CONSTRAINT chk_users_account_type CHECK (
        (account_type = 'Organization' AND organization_id IS NOT NULL) OR
        (account_type = 'Individual'   AND organization_id IS NULL)
    )
) ENGINE=InnoDB;

INSERT INTO Users (user_id, password_hash, account_type, organization_id, display_name) VALUES
('admin', 'admin1223', 'Organization', 1, 'Admin');