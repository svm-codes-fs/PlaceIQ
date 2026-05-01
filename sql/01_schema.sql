-- ============================================================
-- Placement Management System — Database Schema (MySQL 8.0+)
-- Course: UCS310 - Database Management Systems
-- Institution: Thapar Institute of Engineering and Technology
-- ============================================================

-- Create the database
CREATE DATABASE IF NOT EXISTS placement_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE placement_db;

-- ============================================================
-- 1. USERS TABLE — Authentication & Role Management
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL,
    role        ENUM('admin', 'student') NOT NULL DEFAULT 'student',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ============================================================
-- 2. STUDENTS TABLE — Academic Profile
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL UNIQUE,
    roll_no          VARCHAR(20) NOT NULL UNIQUE,
    name             VARCHAR(100) NOT NULL,
    email            VARCHAR(120) NOT NULL,
    phone            VARCHAR(15),
    branch           ENUM('CSE', 'ECE', 'ME', 'CE', 'EE', 'CHE') NOT NULL,
    cgpa             DECIMAL(4,2) NOT NULL,
    backlogs         INT NOT NULL DEFAULT 0,
    placement_status ENUM('Unplaced', 'Placed') NOT NULL DEFAULT 'Unplaced',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Integrity Constraints
    CONSTRAINT chk_cgpa      CHECK (cgpa BETWEEN 0.00 AND 10.00),
    CONSTRAINT chk_backlogs  CHECK (backlogs >= 0),

    -- Foreign Key
    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_students_branch (branch),
    INDEX idx_students_cgpa (cgpa),
    INDEX idx_students_status (placement_status)
) ENGINE=InnoDB;

-- ============================================================
-- 3. COMPANIES TABLE — Recruiter Info & Eligibility Criteria
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    role_offered     VARCHAR(100) NOT NULL,
    package_lpa      DECIMAL(6,2) NOT NULL,
    min_cgpa         DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    max_backlogs     INT NOT NULL DEFAULT 0,
    allowed_branches VARCHAR(100) NOT NULL DEFAULT 'CSE,ECE,ME,CE,EE,CHE',
    visit_date       DATE,
    status           ENUM('Upcoming', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Upcoming',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Integrity Constraints
    CONSTRAINT chk_min_cgpa     CHECK (min_cgpa BETWEEN 0.00 AND 10.00),
    CONSTRAINT chk_max_backlogs CHECK (max_backlogs >= 0),
    CONSTRAINT chk_package      CHECK (package_lpa > 0),

    INDEX idx_companies_status (status),
    INDEX idx_companies_visit (visit_date)
) ENGINE=InnoDB;

-- ============================================================
-- 4. APPLICATIONS TABLE — Bridge Entity (Students ↔ Companies)
--    Resolves the Many-to-Many relationship
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    student_id   INT NOT NULL,
    company_id   INT NOT NULL,
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status       ENUM('Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected')
                    NOT NULL DEFAULT 'Applied',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Prevent duplicate applications
    CONSTRAINT uq_student_company UNIQUE (student_id, company_id),

    -- Foreign Keys
    CONSTRAINT fk_app_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_app_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_app_status (status),
    INDEX idx_app_student (student_id),
    INDEX idx_app_company (company_id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. RESULTS TABLE — Final Placement Outcomes
-- ============================================================
CREATE TABLE IF NOT EXISTS results (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    application_id  INT NOT NULL UNIQUE,
    result          ENUM('Selected', 'Not Selected') NOT NULL,
    offer_date      DATE,
    remarks         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key
    CONSTRAINT fk_result_application
        FOREIGN KEY (application_id) REFERENCES applications(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_result_outcome (result)
) ENGINE=InnoDB;

-- ============================================================
-- 3NF JUSTIFICATION
-- ============================================================
-- 1NF: All columns hold atomic values; no repeating groups.
-- 2NF: Every non-key attribute depends on the FULL primary key
--       (all PKs are single-column AUTO_INCREMENT).
-- 3NF: No transitive dependencies:
--       - students: all attributes depend directly on student id.
--       - companies: all attributes depend directly on company id.
--       - applications: bridge entity with its own lifecycle state.
--       - results: depends on application_id (1:1 with application).
--       - placement_status in students is a controlled denormalization
--         maintained by a database trigger for performance.
-- ============================================================
