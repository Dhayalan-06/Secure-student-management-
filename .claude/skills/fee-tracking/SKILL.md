---
name: fee-tracking
description: Implement or review student fee amounts, due dates, payment status changes, and fee history.
---

Trace the fee DTO, entity, service serializer, and consuming UI together. The service persists amounts to two decimal places and returns a numeric amount. Check the round trip with a fractional amount. Treat a due date as a calendar date and paidAt as a timestamp when formatting either value.

Use backend/src/fees/fees.service.spec.ts for regression coverage. For status changes, check PENDING to PAID, reversal to PENDING, and a repeated update. Establish the requested paidAt behavior for repeated updates before changing it. Verify each student's totals use only their visible fee rows.
