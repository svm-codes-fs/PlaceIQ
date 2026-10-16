"""
Database-level safety net (PostgreSQL only).

The application layer already checks eligibility and policies before inserting
an application (app/services/policies.py). This trigger enforces the core rules
a second time inside the database, so a bug, a script or a manual INSERT that
bypasses the API still cannot create an ineligible or cross-college application.

Installed by the Alembic migration and by the PostgreSQL test fixture.
"""

CREATE_SQL = r"""
CREATE OR REPLACE FUNCTION enforce_application_rules() RETURNS trigger AS $$
DECLARE
    s students%ROWTYPE;
    c companies%ROWTYPE;
    reasons text[] := '{}';
BEGIN
    SELECT * INTO s FROM students WHERE id = NEW.student_id;
    SELECT * INTO c FROM companies WHERE id = NEW.company_id;

    IF s.college_id <> NEW.college_id OR c.college_id <> NEW.college_id THEN
        RAISE EXCEPTION 'application crosses colleges (student %, company %)', NEW.student_id, NEW.company_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF s.cgpa < c.min_cgpa THEN
        reasons := array_append(reasons, format('CGPA %s is below the cutoff of %s', s.cgpa, c.min_cgpa));
    END IF;
    IF s.backlogs > c.max_backlogs THEN
        reasons := array_append(reasons, format('%s backlog(s) exceeds the limit of %s', s.backlogs, c.max_backlogs));
    END IF;
    IF NOT (s.branch::text = ANY (string_to_array(c.allowed_branches, ','))) THEN
        reasons := array_append(reasons, format('branch %s is not allowed', s.branch));
    END IF;
    IF s.placement_status = 'Placed' AND EXISTS (
        SELECT 1 FROM placement_policies p
        WHERE p.college_id = NEW.college_id AND p.rule_type = 'block_after_placement' AND p.enabled
    ) THEN
        reasons := array_append(reasons, 'placed students cannot apply (college policy)');
    END IF;

    IF array_length(reasons, 1) > 0 THEN
        RAISE EXCEPTION 'application rejected: %', array_to_string(reasons, '; ')
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_applications_enforce_rules ON applications;
CREATE TRIGGER trg_applications_enforce_rules
    BEFORE INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION enforce_application_rules();
"""

DROP_SQL = """
DROP TRIGGER IF EXISTS trg_applications_enforce_rules ON applications;
DROP FUNCTION IF EXISTS enforce_application_rules();
"""


def install(connection):
    """Install the trigger when running on PostgreSQL; no-op elsewhere."""
    if connection.dialect.name == 'postgresql':
        # Use the raw driver cursor without parameters, so the `%` in format()
        # and RAISE aren't taken as query placeholders
        with connection.connection.driver_connection.cursor() as cursor:
            cursor.execute(CREATE_SQL)
