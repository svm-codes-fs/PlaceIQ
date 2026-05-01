-- ============================================================
-- Placement Management System — Triggers (MySQL 8.0+)
-- ============================================================

USE placement_db;

DELIMITER //

-- ============================================================
-- 1. AFTER INSERT ON results
--    Automatically updates:
--    - students.placement_status → 'Placed' if Selected
--    - applications.status → 'Offered' or 'Rejected'
-- ============================================================
DROP TRIGGER IF EXISTS trg_after_result_insert //

CREATE TRIGGER trg_after_result_insert
AFTER INSERT ON results
FOR EACH ROW
BEGIN
    DECLARE v_student_id INT;

    -- Get the student_id from the application
    SELECT student_id INTO v_student_id
    FROM applications
    WHERE id = NEW.application_id;

    IF NEW.result = 'Selected' THEN
        -- Update application status to Offered
        UPDATE applications
        SET status = 'Offered'
        WHERE id = NEW.application_id;

        -- Update student placement status to Placed
        UPDATE students
        SET placement_status = 'Placed'
        WHERE id = v_student_id;

    ELSEIF NEW.result = 'Not Selected' THEN
        -- Update application status to Rejected
        UPDATE applications
        SET status = 'Rejected'
        WHERE id = NEW.application_id;
    END IF;
END //


-- ============================================================
-- 2. BEFORE INSERT ON applications
--    Re-validates student eligibility at DB level.
--    Prevents ineligible students from being inserted
--    even if the application bypasses the stored procedure.
-- ============================================================
DROP TRIGGER IF EXISTS trg_before_application_insert //

CREATE TRIGGER trg_before_application_insert
BEFORE INSERT ON applications
FOR EACH ROW
BEGIN
    DECLARE v_cgpa         DECIMAL(4,2);
    DECLARE v_backlogs     INT;
    DECLARE v_branch       VARCHAR(10);
    DECLARE v_status       VARCHAR(10);
    DECLARE v_min_cgpa     DECIMAL(4,2);
    DECLARE v_max_backlogs INT;
    DECLARE v_allowed      VARCHAR(100);

    -- Fetch student details
    SELECT cgpa, backlogs, branch, placement_status
    INTO v_cgpa, v_backlogs, v_branch, v_status
    FROM students
    WHERE id = NEW.student_id;

    -- Fetch company criteria
    SELECT min_cgpa, max_backlogs, allowed_branches
    INTO v_min_cgpa, v_max_backlogs, v_allowed
    FROM companies
    WHERE id = NEW.company_id;

    -- Validate: Student must not be already placed
    IF v_status = 'Placed' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student is already placed and cannot apply.';
    END IF;

    -- Validate: CGPA must meet minimum requirement
    IF v_cgpa < v_min_cgpa THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student CGPA does not meet the minimum requirement.';
    END IF;

    -- Validate: Backlogs must not exceed maximum allowed
    IF v_backlogs > v_max_backlogs THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student has too many backlogs for this company.';
    END IF;

    -- Validate: Branch must be in allowed list
    IF FIND_IN_SET(v_branch, v_allowed) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student branch is not eligible for this company.';
    END IF;
END //

DELIMITER ;
