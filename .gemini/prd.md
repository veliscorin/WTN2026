# 📝 Product Requirements Document: Synchronized Quiz Engine (v13)

**Project Name:** What’s The News 2026 – Academic Quiz Engine  
**Version:** 13.0  
**Target Concurrency:** 10,000 – 12,000 (32,000 Total Users)

---

## 1. PROJECT OVERVIEW
The Synchronized Quiz Engine is a high-concurrency, serverless MCQ platform built for school-wide academic competitions. The system ensures a "Fair Start/Fair Finish" experience using synchronized server clocks and hard-stop mechanisms, supported by a serverless architecture to handle massive traffic bursts.

## 2. TARGET USERS & ENVIRONMENT
* **Primary Users:** Singapore Secondary 4/5 students.
* **Hardware:** Personal Learning Devices (PLDs) – iPads, Chromebooks, Laptops.
* **Access Point:** `whatsthenews2026.com`
* **Connectivity:** School Wi-Fi (requires MOE/School domain whitelisting).

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Pre-Login & Anti-Sabotage Authentication
* **Early Access:** The login prototype opens 30 minutes before the official `StartTime`.
* **Strict Gating:**
    - **Before Window:** Login blocked ("Quiz not started").
    - **In Window (T-30 to T-0):** Login allowed -> Lobby.
    - **Live Session (T-0 to T+Duration):** Login allowed -> Direct to Quiz (Late Join).
    - **Ended (T+Duration):** Login blocked ("Session Ended").
* **Login Credentials:** Email Prefix + School Selection (Dropdown).
* **Overwrite Protection (Sabotage Lock):**
    * The system **must** use **DynamoDB Conditional Writes** (`attribute_not_exists`).
    * Once a student "claims" an email prefix for a specific school, the record is locked.
    * Subsequent attempts to "Start" or "Login" with that identical prefix must be rejected with a "Session already active" error to prevent intentional or accidental sabotage.
* **Join Cut-off:** Entry is strictly blocked if a student attempts to join within the final 5 minutes of the session window.

### 3.2 The Synchronized Lobby (Wait State)
* **Lobby View:** Upon successful login before the start time, users are placed in a "Lobby" state.
* **Drift-Corrected Timer:** The frontend must fetch the server timestamp and calculate "Clock Drift." A countdown timer must display: *"The quiz will begin in MM:SS"*, syncing precisely with the AWS server time.
* **Auto-Trigger:** At `T-minus 0`, the UI must automatically transition to Question 1 via a state change. **No browser refresh should be required.**

### 3.3 Sequential Quiz Experience
* **Navigation:** Linear "Confirm & Next" progression. **The "Back" button is strictly disabled.**
* **Live Session Timer:** A persistent countdown timer in the header displays "Time Remaining," counting down to the `SessionEndTime`.
* **Secure Question Fetching:** Questions are fetched one-by-one. The `correct_answer` key must be stripped by the Lambda before sending the payload to the browser.
* **State Recovery:** Every "Next" click commits the answer and current index to DynamoDB. Upon refresh, the app restores the student to the last unanswered index.

### 3.4 Proctoring & Anti-Cheating (3-Strike Rule)
* **Monitored Events:** `visibilitychange` (tab switch), `window.blur` (app switch), and `fullscreenchange` (exiting fullscreen).
* **Escalation:**
    * **Strike 1:** Warning Overlay.
    * **Strike 2:** Final Warning Overlay.
    * **Strike 3:** **Hard Disqualification**. The system commits `isDisqualified: true` to the database and force-redirects the user to a disqualification screen.

### 3.5 Global Hard-Stop
* At the exact `SessionEndTime`, the Lambda backend must return a `410 Gone` for any answer submissions.
* The frontend must immediately terminate the quiz and redirect to a "Submission Complete" page.

### 3.6 Resume Session Logic
* **State Detection:** On Login page mount, the system checks `localStorage` for an existing session.
* **Resume UI:** If found, the user is presented with a "Resume Quiz" (or "View Results" if `status === 'COMPLETED'`) card instead of the login form.
* **Escape Hatch:** A "Switch Account" option allows clearing local state and returning to the standard login form.

---

## 4. RANKING & REPORTING LOGIC

### 4.1 Leaderboard Generation (Top 20 Per School)
* **Ranking Hierarchy:**
    1. **Primary:** Highest Total Points (Max 30).
    2. **Secondary (Tie-breaker):** Total Time Taken ($FinalSubmitTimestamp - InitialStartTimestamp$) in **milliseconds**.
* **Data Integrity:** All users with a `isDisqualified` flag must be automatically excluded from all ranking calculations.

### 4.2 Automated Results
* **Email Delivery:** Results are triggered via Amazon SES immediately upon quiz completion.
* **Content:** Final Score (X/30) and a review table showing the correct answer keys.

---

## 5. TECHNICAL DATA SCHEMA

### Table: UserState (DynamoDB: WTN_Participants)
| Field | Type | Description |
| :--- | :--- | :--- |
| **email** | String (PK) | Full validated school email (Sabotage-protected). |
| **school_id** | String | ID of the school from the dropdown. |
| **status** | String | `LOBBY`, `IN_PROGRESS`, `COMPLETED`, `DISQUALIFIED`. |
| **current_index** | Number | The question index currently being viewed (0-29). |
| **question_order** | List | Randomized array of QIDs generated at start to ensure persistence. |
| **answers** | Map | Map of QID to selected option value. |
| **score** | Number | Running total of correctly answered questions. |
| **strike_count** | Number | Number of anti-cheating violations (max 3). |
| **start_time** | Timestamp | Epoch MS recorded when the student first exits the Lobby. |
| **is_disqualified** | Boolean | Flag to exclude student from ranking and stop quiz. |

### Table: Questions (DynamoDB: WTN_Questions)
| Field | Type | Description |
| :--- | :--- | :--- |
| **id** | String (PK) | Unique question identifier. |
| **difficulty** | String | easy / medium / hard. |
| **text** | String | The question/prompt text. |
| **options** | Array | List of 4 MCQ choices. |
| **correct_key** | String | **REDACTED:** Used for server-side scoring only. |

### Table: Schools (DynamoDB: WTN_Schools)
| Field | Type | Description |
| :--- | :--- | :--- |
| **id** | String (PK) | Unique school identifier (e.g., 'sch_01'). |
| **name** | String | Full school name. |
| **domain** | String | Email domain (e.g., 'ri.edu.sg'). |

### Table: Sessions (DynamoDB: WTN_Sessions)
| Field | Type | Description |
| :--- | :--- | :--- |
| **id** | String (PK) | Unique session identifier. |
| **startTime** | String | ISO 8601 String (e.g., 2026-04-08T11:00:00+08:00). |
| **durationMinutes** | Number | Session duration in minutes. |
| **schoolIds** | List | List of School IDs allowed in this session. |

---

## 6. SECURITY & PERFORMANCE SPECIFICATION
* **Stack:** Next.js 16, Tailwind CSS 4 (PostCSS), TypeScript.
* **UI Patterns:** Reusable components in `src/components/ui`, class-merging via `cn` utility (`clsx` + `tailwind-merge`).
* **Scaling:** Provisioned Concurrency (8,000–10,000 units) to be active 15 mins before and after each window.
* **Networking:** Non-VPC Lambda execution to eliminate ENI cold-start delays.
* **Persistence:** Write-on-action strategy for all student responses to prevent data loss on school Wi-Fi drops.

### 6.1 Infrastructure & DNS
* **DNS Migration:** Migrated from Vodien to AWS Route 53 to resolve root domain SSL handshake/latency issues.
* **Record Strategy:** Uses A (Alias) records for both root (`@`) and `www` pointing strictly to the Amplify CloudFront distribution.
* **Compute Platform:** Uses Amplify's managed `WEB_COMPUTE` platform. This handles all Next.js SSR and API routes automatically, removing the need for manual Lambda function management.

### 6.2 Test Mode
* **Trigger:** Enabled via `NEXT_PUBLIC_TEST_MODE=true`.
* **Behavior:** 
    - Question count limited to 6 (2 per difficulty).
    - Login entry window reduced to 3 minutes.
    - Global "Big Red Banner" indicates Test Mode status.
    - Duration remains database-driven for dynamic testing.
