# Describing PlaceIQ on a resume

Every number below comes from [BENCHMARKS.md](../BENCHMARKS.md) and can be reproduced from the
scripts in `benchmarks/`. Keep the numbers you can defend in an interview.

## Resume entry

**PlaceIQ — AI-Powered Campus Placement Platform** | React, Flask, PostgreSQL + pgvector, Celery, Redis, Docker, Claude API
[github.com/svm-codes-fs/Placement-management-system](https://github.com/svm-codes-fs/Placement-management-system)

- Built a multi-tenant recruitment platform for students, placement cells and platform admins; isolated each college's data with SQLAlchemy session hooks plus a PostgreSQL trigger, verified by tenant-isolation tests.
- Implemented AI resume parsing with the Claude API (validated structured outputs) and semantic job matching with local embeddings in pgvector, reaching **0.95 precision@5** vs 0.89 for skill overlap alone on a labelled evaluation set.
- Designed asynchronous pipelines with Celery and Redis (resume parsing, interview scoring, all-or-nothing bulk imports, scheduled offer expiry) and real-time notifications over Socket.IO, delivered from worker processes through Redis.
- Profiled with EXPLAIN ANALYZE on 5,000 students and 20,000 applications: composite indexes made the busiest admin query **38× faster** (5.3 ms → 0.14 ms) and pagination with eager loading cut an endpoint from **1,081 ms to 26 ms**; dropped an HNSW index after measuring **recall 0.26** under the tenant filter.
- Load-tested with Locust: **100 concurrent users at p95 250 ms with zero errors**; shipped with 58 tests (89% coverage) and CI that runs the full Docker production stack (nginx, gunicorn, Celery, PostgreSQL, Redis) behind an end-to-end smoke test.

## Shorter version (3 bullets)

- Built a multi-tenant campus placement platform (React, Flask, PostgreSQL + pgvector) with per-college data isolation enforced in the ORM and by a database trigger.
- Added Claude-powered resume parsing and mock interviews, and semantic job matching with local embeddings (0.95 precision@5 vs 0.125 random); background work on Celery + Redis with live Socket.IO notifications.
- Cut the slowest admin endpoint from 1,081 ms to 26 ms and the busiest query 38× via measured indexing and pagination; 100 concurrent users at p95 250 ms, 0 errors; 89% test coverage with CI running the full Docker stack.

## Questions to be ready for

- **Why not just filter by `college_id` in each query?** One forgotten filter leaks another college's data. The session hook makes isolation the default; the trigger is a second layer for anything that bypasses the ORM.
- **Why drop the HNSW index?** It's approximate and filters after the search, so with a per-college filter it returned 13 of 50 neighbours. Exact search over one college (1,667 students) takes 1.8 ms, so correctness was free. pgvector 0.8's iterative scans would be the next step at much larger scale.
- **What limits throughput?** One Python process saturates at about 60 requests/s on a 4-core laptop. The API is stateless, so it scales out with more processes; Socket.IO already fans out through Redis, with sticky sessions for the socket path.
- **How do you keep AI output honest?** Structured outputs validated against Pydantic schemas, refusal handling with a server-side fallback, and students confirm the parsed profile before it's used. The UI always says whether Claude or the offline fallback produced a result.
- **How was matching evaluated?** A labelled synthetic set (8 overlapping role families, 40 jobs, 56 students) generated with a fixed seed; it's a regression check and a relative comparison, not a claim about real-world accuracy.
