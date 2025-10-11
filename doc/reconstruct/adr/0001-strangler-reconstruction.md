ADR 0001: Strangler Reconstruction Approach

Context
- The codebase is functional but mixing legacy patterns (eager OpenAI client, duplicated guards, server-uploaded images) with modern goals in doc/new-plans/rewrite-roadmap.md.
- Several upgrades (Next 15/React 19/Prisma 6/Responses API) are breaking if done in one step.
- The admin AI and manual workflows must remain available while we modernize.

Decision
- Use a strangler pattern: deliver small, isolated slices that introduce new architecture surfaces (typed env, guards, rate limit, jobs, direct uploads, indexes) and gradually route traffic to them.
- Keep each slice deployable and reversible, with explicit acceptance and validation.

Consequences
- Lower risk and easier rollback versus a big-bang rewrite.
- Slight overhead to maintain shims and compatibility during transition (e.g., Chat Completions alongside Responses API).
- Clearer ownership and documentation for each migration step.

Alternatives Considered
- Big-bang upgrade: rejected due to risk, downtime potential, and high coordination cost.
- Freeze-and-rewrite: rejected; would stall features and complicate data and auth migrations.

Status
- Accepted.

