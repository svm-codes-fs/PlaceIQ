-- ============================================================
-- Placement Management System — Stored Procedures (MySQL 8.0+)
-- ============================================================

USE placement_db;

DELIMITER //

-- ============================================================
-- 1. CHECK ELIGIBILITY
--    Returns 1 if student is eligible for a company, 0 otherwise.
--    Checks: CGPA >= min_cgpa, backlogs <= max_backlogs,
--            branch IN allowed_branches, student NOT already placed.
-- ============================================================
DROP PROCEDURE IF EXISTS check_eligibility //

CREATE PROCEDURE check_eligibility(
    IN p_student_id INT,
    IN p_company_id INT,
    OUT p_eligible  TINYINT
)
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
    WHERE id = p_student_id;

    -- Fetch company criteria
    SELECT min_cgpa, max_backlogs, allowed_branches
    INTO v_min_cgpa, v_max_backlogs, v_allowed
    FROM companies
    WHERE id = p_company_id;

    -- Evaluate eligibility
    IF v_status = 'Placed' THEN
        SET p_eligible = 0;
    ELSEIF v_cgpa < v_min_cgpa THEN
        SET p_eligible = 0;
    ELSEIF v_backlogs > v_max_backlogs THEN
        SET p_eligible = 0;
    ELSEIF FIND_IN_SET(v_branch, v_allowed) = 0 THEN
        SET p_eligible = 0;
    ELSE
        SET p_eligible = 1;
    END IF;
END //


-- ============================================================
-- 2. APPLY TO COMPANY
--    Validates eligibility then inserts into applications.
--    Raises SQLSTATE 45000 on failure.
-- ============================================================
DROP PROCEDURE IF EXISTS apply_to_company //

CREATE PROCEDURE apply_to_company(
    IN p_student_id INT,
    IN p_company_id INT
)
BEGIN
    DECLARE v_eligible TINYINT DEFAULT 0;
    DECLARE v_exists   INT DEFAULT 0;

    -- Check if already applied
    SELECT COUNT(*) INTO v_exists
    FROM applications
    WHERE student_id = p_student_id AND company_id = p_company_id;

    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'You have already applied to this company.';
    END IF;

    -- Check eligibility
    CALL check_eligibility(p_student_id, p_company_id, v_eligible);

    IF v_eligible = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'You are not eligible for this company based on CGPA, backlogs, or branch requirements.';
    END IF;

    -- Insert application
    INSERT INTO applications (student_id, company_id, status)
    VALUES (p_student_id, p_company_id, 'Applied');
END //


-- ============================================================
-- 3. GET ELIGIBLE COMPANIES FOR A STUDENT
--    Returns all companies the student qualifies for
--    and has NOT already applied to.
-- ============================================================
DROP PROCEDURE IF EXISTS get_eligible_companies //

CREATE PROCEDURE get_eligible_companies(
    IN p_student_id INT
)
BEGIN
    DECLARE v_cgpa     DECIMAL(4,2);
    DECLARE v_backlogs INT;
    DECLARE v_branch   VARCHAR(10);
    DECLARE v_status   VARCHAR(10);

    -- Fetch student details
    SELECT cgpa, backlogs, branch, placement_status
    INTO v_cgpa, v_backlogs, v_branch, v_status
    FROM students
    WHERE id = p_student_id;

    -- Return eligible companies
    SELECT c.*
    FROM companies c
    WHERE c.min_cgpa <= v_cgpa
      AND c.max_backlogs >= v_backlogs
      AND FIND_IN_SET(v_branch, c.allowed_branches) > 0
      AND v_status = 'Unplaced'
      AND c.id NOT IN (
          SELECT company_id FROM applications WHERE student_id = p_student_id
      )
    ORDER BY c.package_lpa DESC;
END //


-- ============================================================
-- 4. GET PLACEMENT REPORT (Company-wise)
--    Uses JOINs and aggregate functions.
-- ============================================================
DROP PROCEDURE IF EXISTS get_placement_report //

CREATE PROCEDURE get_placement_report()
BEGIN
    SELECT
        c.id                AS company_id,
        c.name              AS company_name,
        c.role_offered,
        c.package_lpa,
        COUNT(a.id)         AS total_applications,
        SUM(CASE WHEN r.result = 'Selected' THEN 1 ELSE 0 END)     AS selected_count,
        SUM(CASE WHEN r.result = 'Not Selected' THEN 1 ELSE 0 END) AS rejected_count,
        COUNT(a.id) - COUNT(r.id)                                    AS pending_count
    FROM companies c
    LEFT JOIN applications a ON c.id = a.company_id
    LEFT JOIN results r      ON a.id = r.application_id
    GROUP BY c.id, c.name, c.role_offered, c.package_lpa
    ORDER BY c.name;
END //


-- ============================================================
-- 5. GET ELIGIBILITY LIST FOR A COMPANY
--    Returns all students eligible for a specific company.
-- ============================================================
DROP PROCEDURE IF EXISTS get_eligibility_list //

CREATE PROCEDURE get_eligibility_list(
    IN p_company_id INT
)
BEGIN
    DECLARE v_min_cgpa     DECIMAL(4,2);
    DECLARE v_max_backlogs INT;
    DECLARE v_allowed      VARCHAR(100);

    -- Fetch company criteria
    SELECT min_cgpa, max_backlogs, allowed_branches
    INTO v_min_cgpa, v_max_backlogs, v_allowed
    FROM companies
    WHERE id = p_company_id;

    -- Return eligible students
    SELECT s.*
    FROM students s
    WHERE s.cgpa >= v_min_cgpa
      AND s.backlogs <= v_max_backlogs
      AND FIND_IN_SET(s.branch, v_allowed) > 0
      AND s.placement_status = 'Unplaced'
    ORDER BY s.cgpa DESC;
END //


-- ============================================================
-- 6. RECORD RESULT
--    Admin records a result for an application.
-- ============================================================
DROP PROCEDURE IF EXISTS record_result //

CREATE PROCEDURE record_result(
    IN p_application_id INT,
    IN p_result         VARCHAR(20),
    IN p_offer_date     DATE,
    IN p_remarks        TEXT
)
BEGIN
    DECLARE v_exists INT DEFAULT 0;

    -- Check if result already exists
    SELECT COUNT(*) INTO v_exists
    FROM results
    WHERE application_id = p_application_id;

    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A result has already been recorded for this application.';
    END IF;

    -- Insert result (trigger will handle status updates)
    INSERT INTO results (application_id, result, offer_date, remarks)
    VALUES (p_application_id, p_result, p_offer_date, p_remarks);
END //

DELIMITER ;
