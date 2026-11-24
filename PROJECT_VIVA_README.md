# Secure Student Management: 40-minute mentor and viva notes

Based on the repository source reviewed on 24 November 2026. This is a study guide to the **current code**, not a claim that every feature has been tested against a running database. Read the bold answers aloud in your own words, then use the file paths to inspect examples.

## Your 40-minute route

| Time | Read | What to practise saying |
| --- | --- | --- |
| 0–5 min | Project story and architecture | The problem, users, and request path |
| 5–15 min | Frontend components, state, forms | Where each feature lives and why state changes |
| 15–23 min | API, auth, permissions | Login, JWT, role checks, ownership |
| 23–31 min | Database and feature workflows | Student, fee, result lifecycle |
| 31–37 min | Questions and honest limitations | Explain tradeoffs and improvements |
| 37–40 min | Rapid-fire recall | Give 30-second answers without looking |

## The 60-second project explanation

“Secure Student Management is a role-based academic portal. Students can register, view their linked student profile and fees, and look up their own results with an assigned registration number. Admins manage students and fees; admins and staff can manage academic results. The frontend is a React single-page application built with Vite, Tailwind CSS, React Router and Axios. A NestJS API validates requests, checks JWT authentication and roles, and persists data in PostgreSQL. TypeORM manages the core entities. The results service uses parameterized SQL for subjects and marks. Capacitor packages the same web build for mobile.”

**Request path:** React form → shared Axios client → `/api` NestJS controller → validation pipe → JWT/role guard where required → service → PostgreSQL → JSON response → React state → rendered UI.

**Important distinction:** A hidden button is a user experience choice. The API guard and service ownership check are the security boundary.

## Folder map and technologies

| Folder/file | Purpose | Mentor question and concise answer |
| --- | --- | --- |
| `frontend/src/main.jsx` | React entry point; chooses browser or hash router; Google provider | **Why two routers?** Browser history works on web; hash routing works with Capacitor's bundled WebView. |
| `frontend/src/App.jsx` | Main state coordinator; session, navigation, dashboard data, fees | **Why is state here?** Auth and shared workspace data are needed by several pages. It is also a refactoring candidate. |
| `frontend/src/AuthPage.jsx` | Login/registration form, theme switch, Google button | **Controlled inputs?** Their values come from React state and `onChange` updates that state. |
| `frontend/src/StudentRegister.jsx` | Search, pagination, student editor and table | **How is data loaded?** Effect calls paginated `/students`, cancels stale requests, and tracks query/page/revision. |
| `frontend/src/ResultsPanel.jsx` | Registration number lookup, marksheet, subject/mark editing | **How are results found?** Authenticated lookup posts the number; server enforces student ownership. |
| `frontend/src/WorkspaceHome.jsx` | Dashboard metrics, previews and links | **Derived data?** Pending count and outstanding amount are computed from fee records. |
| `frontend/src/RegistryShell.jsx` | Shared sidebar, account controls, date, main area | **Why a shell?** Common layout and navigation stay consistent across routes. |
| `frontend/src/LoginFeatures.jsx` | Login page feature carousel | **What about reduced motion?** Autoplay is disabled when the user requests reduced motion. |
| `frontend/src/InteractiveCTAButton.jsx`, `ShiningGoogleButton.jsx`, `LightBeamButton.jsx`, `CurlyBorderCard.jsx` | Reusable visual/button pieces | **Why components?** Reuse behavior and styling; the first two are used on the auth screen. Check imports before claiming all are used. |
| `frontend/src/services/api.js` | Axios instance and bearer token interceptor | **Why one client?** Shared API base URL and consistent authorization header. |
| `frontend/src/*.css`, `frontend/public` | Tailwind/custom styles and images | **Why both Tailwind and CSS?** Utility styling plus component-specific visual effects and layout. |
| `frontend/*.test.*`, `jest.config.js`, `eslint.config.js`, `tsconfig.json` | Frontend tests and static checks | **Does typecheck mean the JSX is fully typed?** No; the frontend remains primarily JavaScript/JSX. |
| `frontend/vite.config.js`, `index.html`, `.env.example` | Build, development proxy, HTML, public client configuration | **Is `VITE_` secret?** No. Vite exposes those values in the client bundle. |
| `frontend/capacitor.config.json`, `frontend/android`, `frontend/ANDROID.md` | Native wrapper/build instructions | **Is this a native UI?** No, the React build runs inside a WebView. |
| `backend/src/main.ts`, `app.module.ts` | Nest bootstrap, CORS, validation, database and modules | **Why modules?** Group controllers/services and dependencies by feature. |
| `backend/src/auth`, `users`, `common` | Credentials, JWT, users, guards and role decorator | **Who enforces access?** JWT guard verifies identity; role guard checks route permissions; services check record ownership. |
| `backend/src/students`, `departments`, `fees`, `results` | Feature controllers, services, DTOs and entities | **Controller vs service?** Controller handles HTTP; service contains business logic/data access. |
| `backend/sql` | Results and registration number SQL | **Why SQL scripts?** `synchronize` is disabled, so required schema changes must be applied explicitly. |
| `backend/src/**/*.spec.ts`, `postman` | Backend tests and API workspace files | **How do you verify?** Unit/controller tests plus frontend tests and manual end-to-end flows. |

**Stack terms:** React renders components from state. Vite serves and bundles the frontend. React Router maps URLs to views. Axios sends HTTP requests. NestJS organizes the API with decorators and dependency injection. TypeORM maps core classes to PostgreSQL tables. PostgreSQL stores relational data and enforces keys/uniqueness. JWT is a signed token for authentication. bcrypt hashes passwords. Google sign-in verifies a Google-issued ID credential on the server. Capacitor wraps the web app for Android/iOS. Jest and Testing Library exercise behavior; ESLint checks code patterns; Prettier formats code. These tools have different jobs.

## Frontend component tree and navigation

```text
main.jsx
└─ GoogleOAuthProvider → RouterProvider → App
   ├─ AuthPage (signed out)
   │  ├─ LoginFeatures
   │  ├─ InteractiveCTAButton
   │  └─ ShiningGoogleButton + hidden GoogleLogin trigger
   └─ RegistryShell (signed in)
      ├─ WorkspaceHome (/home)
      ├─ StudentRegister (/students)
      ├─ Fee section in App (/fees)
      └─ ResultsPanel (/results)
         └─ Marksheet (after successful lookup)
```

`main.jsx` defines a wildcard route and `App.jsx` reads `useLocation().pathname` to select the workspace page. `useNavigate` handles redirects. The fee page is excluded from navigation for staff; direct navigation is redirected. Login and registration use `/` and `/register`. App changes the document title and moves focus to page headings after navigation.

**Likely question: What is the difference between routing and conditional rendering here?** React Router maintains the URL/history; `App` conditionally renders the matching component. There is currently a single wildcard route, so route-level code splitting and 404 handling are future improvements.

## Every significant frontend state, effect and ref

| Component | State/ref | Why it exists |
| --- | --- | --- |
| `App` | `isDark` | Theme, document theme attribute and theme-color meta tag; preference saved locally. |
| `App` | `checkingSession`, `user` | Prevents showing a signed-in page until `/auth/me` checks a stored token. |
| `App` | `email`, `password`, `rememberMe`, `registrationProfile` | Controlled auth fields. Remember me stores **email**, not password. |
| `App` | `students`, `studentTotal`, `studentStatus` | Dashboard and fee-selector student data, count and load state. |
| `App` | `fees`, `feeStatus` | Fee data and load state. |
| `App` | `error`, `message`, `busy`, `isExiting` | Feedback, submit lock and login exit animation. |
| `App` | `showFeeForm`, `feeForm`, `refresh` | Fee editor visibility/draft; increment `refresh` to reload data after writes. |
| `App` | `previousPage` ref | Detects page changes to focus a heading and scroll to top. |
| `AuthPage` | `showPassword` | Toggles password input visibility without changing its value. |
| `StudentRegister` | `search`, `page`, `revision`, `result` | Search/pagination and cache identity. Revision triggers a reload after mutations. |
| `StudentRegister` | `draft`, `busy`, `status`, `error`, `editor` ref | Student form draft, feedback, submit lock and focus management. |
| `ResultsPanel` | `record`, `number`, `revealed`, `checking`, `error` | Lookup input/request state; successful result opens the marksheet. |
| `ResultsPanel` | `request`, `numberInput`, `returnFocus` refs | Abort in-flight lookup and return keyboard focus on close. |
| `Marksheet` | `semester`, `marks`, `subjects`, `catalogVersion`, `catalogState`, `editor`, `saving`, `error`, `message` | Selected term, fetched data, retry key, editor draft/mode and feedback. |
| `Marksheet` | `heading`, `writePending` refs | Heading focus; prevent duplicate writes without waiting for a rerender. |
| `LoginFeatures` | `current`, `playing` | Selected carousel slide and autoplay. |

**`useState` vs `useRef`:** State changes cause a render; refs hold mutable values or DOM nodes without triggering one. **`useEffect`:** Runs side effects such as fetching data, timers, listeners, title updates, and cleanup. **`useLayoutEffect`:** Runs before paint; used here for theme/focus changes. **Derived values:** `role`, `isAdmin`, `canEdit`, `pending`, `outstanding`, semester totals and percentages are computed from state rather than stored separately. **Cleanup:** Abort controllers and interval/listener cleanup prevent stale work after changes or unmounting.

## All forms: field → state → request

| Form | Inputs and validation in UI | Handler/API | What to explain |
| --- | --- | --- | --- |
| Login | Email, password (minimum 8), remember-me; password reveal | `App.submit` → `POST /auth/login` | On success save token, set user or call `/auth/me`, clear password. Invalid credentials display an error. |
| Registration | Name, department, age 16–100, CGPA 0–10, email, password | `App.submit` → `POST /auth/register` | Numeric strings become numbers. Public registration creates a student account and profile in one database transaction. |
| Google sign-in | Google credential from `GoogleLogin`; visible custom button | `App.submitGoogleCredential` → `POST /auth/google` | Backend verifies ID token audience and verified email; client ID is public. |
| Student editor | Name, email, optional registration number, department, age, CGPA | `StudentRegister.save` → `POST /students` or `PATCH /students/:id` | Admin creates/deletes; admin and staff edit. Staff cannot change email or registration number. Cancel discards the draft. |
| Student search | Search text and previous/next page | Effect → `GET /students?page=&limit=12&search=` | Server paginates; query/page/revision identify the current response. Abort cancels outdated requests. |
| Fee creation | Student selector, description, positive amount, due date | `App.saveFee` → `POST /fees` | Admin only. New fee starts `PENDING`; server validates values. |
| Fee status | Mark paid/pending button | `App.changeFeeStatus` → `PATCH /fees/:id/status` | Admin only. Backend sets or clears `paidAt`. |
| Result lookup | Masked hall ticket/registration number, reveal button | `ResultsPanel.lookup` → `POST /results/lookup` | Number is trimmed, not saved after success. Student can retrieve only own linked record. |
| Subject editor | Name, unique code, internal maximum, exam maximum, selected semester | `Marksheet.save` → `POST /results/subjects` | Admin/staff. Server upserts subject by code; catalog reload/reconciliation matters. |
| Mark editor | Internal and exam marks, including zero | `Marksheet.save` → `POST /results/marks` | Admin/staff. Body includes verified `record.student.id` and subject ID; server checks maxima and saves/upserts. |

**Controlled vs uncontrolled forms:** Auth, fee and student editor inputs use React `value` plus `onChange`. The result editor uses browser form values through `FormData` and `defaultValue`. Native constraints (`required`, `min`, `max`, `pattern`) give immediate feedback; backend DTOs repeat validation because client checks can be bypassed.

**Important caveat:** The fee selector uses the dashboard's first 100 students (`App.jsx` requests `limit: 100`), so a larger dataset needs a paginated/searchable selector. The student search sends a request on each keystroke; cancellation helps, but debouncing would reduce requests.

## Authentication, authorization and roles

1. Email registration normalizes email, hashes the password with bcrypt (cost 12), creates a `student` user and linked profile in a transaction. It does not accept a public role selection.
2. Email login compares the password hash and signs a JWT containing `sub`, email and role.
3. Frontend stores `accessToken` in `localStorage`; Axios adds `Authorization: Bearer ...` to requests. On initial load, `/auth/me` checks the token. Logout removes it and resets UI state.
4. Google sign-in sends a credential to the backend. The backend verifies it with Google's library and the configured audience, requires a verified email, and finds or creates a student-role user. A new Google user may still need a linked student profile.
5. `JwtAuthGuard` verifies bearer tokens. `RolesGuard` reads `@Roles(...)`. Student ownership is checked in services/queries. Roles in the database are lowercase (`admin`, `staff`, `student`); frontend uppercases for comparisons.

| Action | Admin | Staff | Student |
| --- | --- | --- | --- |
| View students | All | All | Own linked profile |
| Create/delete student | Yes | No | No |
| Edit student | Yes | Yes, restricted fields | No |
| View fees | All | No | Own linked fees |
| Create/change fee | Yes | No | No |
| Look up results | Any assigned number | Any assigned number | Own assigned number only |
| Create subject/save marks | Yes | Yes | No |

**Security questions:**

- **Why is frontend role checking insufficient?** Browser code can be altered and requests can be sent directly. Server checks must reject unauthorized requests.
- **JWT vs password hash?** JWT proves a session and carries claims; bcrypt stores a one-way password hash. Neither is encryption of the password.
- **What is an access token risk here?** `localStorage` is readable by JavaScript running on the origin, so XSS protection matters. A server-managed `HttpOnly` cookie is an architectural alternative with its own CSRF considerations.
- **401 vs 403 vs 404?** Unauthenticated/invalid token, authenticated but disallowed role, and missing resource. Results lookup deliberately returns the same 404 for a nonexistent number and a student's attempt to view another student's number.
- **What does CORS do?** Restricts which browser origins may call the API; it is not authentication. `main.ts` allows configured frontend and local/Capacitor origins.

## Backend and database in one pass

`main.ts` starts Nest at port 3000 by default, prefixes routes with `/api`, enables CORS, and installs a `ValidationPipe` with transformation, whitelisting and rejection of extra fields. `app.module.ts` reads environment settings and connects TypeORM to PostgreSQL with `synchronize: false`.

**Core data model:** `users` contains email, hidden password hash and role. `students` contains identity, age, CGPA, optional unique registration number, optional user link and department link. `departments` gives a reusable department name. `fee_transactions` links to students and stores amount, due date, `PENDING`/`PAID`, payment timestamp. `subjects` and `student_marks` are created by SQL scripts; a mark joins one student and one subject. Core entities use TypeORM repositories; the results service uses parameterized `DataSource.query(...)` SQL (`$1`, `$2`, etc.), which keeps values out of SQL text.

**Student flow:** `StudentsController` exposes list/detail/create/update/delete. Service paginates with a maximum page size of 100 and searches across name, email, registration number and department. Student accounts see only their linked profile. Create/update use transactions and find or create a department. Only admins can change registration numbers. Deleting a student with fee records is rejected to preserve payment history.

**Fee flow:** `FeesController` restricts list to admin/student and writes to admin. Student list is joined to their user ID. Create stores amount to two decimal places and starts pending. A status update sets `paidAt` when paid and clears it when pending.

**Result flow:** Admin assigns a unique registration number. A signed-in user posts it to `/api/results/lookup`. The student query includes `user_id` ownership; admin/staff can look up any assigned number. The response contains a student identity and marks, possibly an empty marks array. Subjects are available for the marksheet; staff/admin can upsert subjects and marks. The server rejects marks above their subject maximum. Grade boundaries are O ≥90%, A+ ≥80%, A ≥70%, B+ ≥60%, B ≥50%, C ≥40%, Fail below 40%. The frontend also computes an aggregate grade for the currently selected semester from saved marks; a pending subject is not included in that denominator.

**Schema setup caveat:** `backend/sql/semester-results.sql` and `backend/sql/student-registration-number.sql` are present, but the base schema migration files named by the root README are absent from the current file list. A fresh database setup needs those core tables established first. Do not claim a fresh clone is fully deployable without checking the schema and environment.

## Likely mentor questions with answers you can say

1. **What problem does your project solve?** “It centralizes student profiles, fee records and academic results with role-based access.”
2. **What happens when a user submits login?** “React sends credentials to Nest; Nest compares a bcrypt hash, signs a JWT, and React stores the token and loads protected data.”
3. **How does the app remember a session?** “On reload it finds the token and calls `/auth/me`; failure removes that token.”
4. **Why use React state?** “It keeps form values, request status and displayed data in sync with UI rendering.”
5. **Why use a ref?** “For DOM focus or mutable request locks that should not cause a rerender.”
6. **Why abort requests?** “To avoid updating state from a response that belongs to an old query or unmounted component.”
7. **How does pagination work?** “The register sends page, limit and search; the server uses skip/take and returns total count.”
8. **How is a student restricted to their data?** “The backend joins records to the authenticated user ID and applies role/ownership checks.”
9. **How does Google login differ from password login?** “Google issues an ID credential; our backend validates it and then issues our own JWT.”
10. **Why use DTOs?** “They declare the accepted request shape and validation rules at the API boundary.”
11. **Why a database transaction on registration?** “The user and student profile should both be saved or both roll back.”
12. **Why not trust UI validation?** “A client can bypass it, so the server validates again.”
13. **What is the difference between a controller and service?** “Controller maps HTTP to methods; service implements business rules and data operations.”
14. **How do you prevent SQL injection in results queries?** “Dynamic values use PostgreSQL placeholders and parameter arrays.”
15. **Why is `synchronize` off?** “Schema changes are explicit so production data is not changed unexpectedly by application startup.”
16. **What happens if fee records exist when deleting a student?** “The service returns a conflict and preserves the student and payment history.”
17. **What is the source of truth for grades?** “The backend calculates individual mark grades; the frontend also calculates display totals for the selected term.”
18. **How do you handle API failure in the UI?** “Show an error and, in the student register/results catalog, allow retry. Some fee error states still need refinement.”
19. **How is the app accessible?** “Inputs have labels, messages use status/alert roles, tables have captions or labels, route headings receive focus, and the carousel respects reduced motion.”
20. **What would you improve first?** “Make checks pass, improve fee loading/error states, add scalable student lookup, split App's responsibilities, and test with a real database.”

## Honest limitations and what to improve

- `App.jsx` still coordinates many unrelated concerns. Extracting fee management and a session/data hook would reduce coupling.
- The fee table currently uses an empty-state row whenever `fees` is empty, including while loading or after a failed request. Show dedicated loading/error/retry states.
- A student selector populated from only 100 records will not scale. Use search or paginated lookup.
- There is one shared top-level error/message state for several workspace requests. Per-feature errors would avoid one request replacing another's message.
- Token expiry during normal use is not handled by a shared response interceptor; only initial session validation clears a bad token.
- The results panel depends on a successful registration number lookup even for editors. This is intentional in the current UI; verify that it meets your institution's workflow.
- The README and older `PROJECT_TECHNICAL_NOTES.md` contain outdated assumptions. For a viva, prefer the current code and this document.
- The previously run frontend checks found a passing build and typecheck, but lint reported four unused imports and one of 16 tests failed around opening the subject editor. Rerun checks before presenting a current status; do not claim they pass without evidence.

## Commands to know

```text
backend:  npm run start:dev | npm run build | npm test | npm run seed:admin
frontend: npm run dev | npm run build | npm run lint | npm run typecheck | npm test
mobile:   npm run android:sync | npm run android:open
```

Backend usually listens on `http://localhost:3000/api`; Vite usually serves `http://localhost:5173`. The Vite development config proxies `/api` to backend port 3000, while `services/api.js` uses `VITE_API_BASE_URL` or its default backend URL. A physical phone cannot use `localhost` to reach the development backend; use a reachable HTTPS API URL. `VITE_GOOGLE_CLIENT_ID` is a public client setting; backend secrets, database credentials and JWT secret belong in the backend environment.

## Final rapid-fire drill

Without looking, explain: **the full login request path; each role's permissions; the difference between `useState`, `useRef` and `useEffect`; every form's submit endpoint; why the registration lookup does not expose another student's marks; the database relationships; why both frontend and backend validate; how a fee becomes paid; how a grade is calculated; one real limitation and your next fix.** If you can do that clearly in three minutes, you know the project well enough to handle most follow-up questions.
