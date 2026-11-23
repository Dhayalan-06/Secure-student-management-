---
name: semester-results
description: Implement or review subject, mark-entry, and grade changes across the results service and ResultsPanel.
---

Trace the requested change through backend/src/results, backend/sql/semester-results.sql, and frontend/src/ResultsPanel.jsx. Use the subject's configured internal and semester maxima when validating marks. Preserve a legitimate zero score through input parsing, storage, and display.

Use the service's grade calculation as the authority. When changing rounding or cutoffs, check a score exactly at a boundary and one just below it. For mark edits, verify that saving twice for the same student and subject updates one record and that switching semesters shows the matching subjects.
