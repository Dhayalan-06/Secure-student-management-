---
name: react-data-flows
description: Wire React forms, searches, and record actions to real API data with recoverable loading and failure states.
---

Trace the action from the route and component to frontend/src/services/api.js and the corresponding backend handler. Confirm the actual parameters, response shape, and authorization requirements before wiring the UI.

For search, prevent an older response from replacing newer results. For saves, guard duplicate submissions, preserve edits on failure, and reconcile successful changes with the returned record. Distinguish initial loading, empty results, and request errors. Verify the flow through the visible controls, including a failed request followed by a retry.
