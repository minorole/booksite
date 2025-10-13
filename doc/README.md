# Project Documentation

This folder hosts reusable project documentation. It’s organized for incremental, reviewable changes that pair with our Diagnose → Design → Deliver → Verify → Audit workflow.

Structure
- `adr/` — Architecture Decision Records (one file per decision).
- `guides/` — How‑tos and playbooks (optional; add as needed).

Conventions
- ADRs follow a lightweight template: Context → Decision → Changes → Verification → Consequences → Rollback → Follow‑ups.
- Name ADRs as sequential `YYYYMMDD-<slug>.md` or `0001-<slug>.md` for easy tracking.
- Keep code references workspace‑relative (e.g., `src/lib/admin/services/vision.ts`).

How to add a new ADR
1. Create a new file in `doc/adr/` using the naming convention.
2. Capture the problem, options considered, and the decision with rationale.
3. Link impacted files and APIs, and add verification steps.
4. Keep it concise and focused on the decision at hand.

