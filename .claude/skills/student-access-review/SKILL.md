---
name: student-access-review
description: Review proposed changes to student record access, ownership, and role permissions in the NestJS backend.
---

Start at the affected controller and trace its guards, role decorators, authenticated user, and service query. Write down which roles can perform the operation and which records each role can reach. Check list and detail paths separately, including filters and pagination counts.

For profile edits, inspect which fields each role can write and how the service resolves the linked student. For registration changes, verify that the server assigns the public role. Use synthetic users in the existing controller or service tests to cover an allowed action and a denied action. Verify that denied writes leave the stored record intact.
