---
name: postgres-schema-change
description: Prepare PostgreSQL schema changes that preserve existing student management records and match the NestJS data model.
---

Locate the tracked SQL files and the code that reads each affected table. Results use explicit SQL in backend/src/results alongside TypeORM entities elsewhere. Verify migration paths on disk before citing setup commands.

For an existing populated table, plan additions, deterministic backfills, and constraint enforcement in that order when appropriate. Identify how unmatched legacy values and duplicate keys will be handled. Check foreign-key deletion behavior for related history. Exercise the script on a disposable database with representative old rows when available, then verify counts, relationships, and the application query. Report which checks actually ran.
