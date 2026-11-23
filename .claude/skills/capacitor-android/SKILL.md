---
name: capacitor-android
description: Adapt and verify the existing React frontend for the project's Capacitor Android app.
---

Read frontend/capacitor.config.json and frontend/package.json to identify the bundle directory and Android sync command. Trace API configuration in frontend/src/services/api.js when a feature works on desktop but fails on device. Determine what host the emulator or physical phone can actually reach.

For mobile UI changes, exercise the affected route with the soft keyboard open, check system-bar insets, and try Android Back from the deepest navigation state. When preparing a device build, use the existing android:sync script from frontend and inspect the resulting diff. Distinguish web build, native build, and device checks in the handoff.
