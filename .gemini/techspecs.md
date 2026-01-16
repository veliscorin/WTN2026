# 🛠️ Technical Specification: AWS Serverless Quiz Engine

## 1. Stack & Environment
* **Framework:** Next.js 16 (App Router).
* **Styling:** Tailwind CSS (Mobile-first, Exam Aesthetic).
* **Deployment:** AWS Amplify (Singapore / ap-southeast-1).
* **Database:** AWS DynamoDB (Serverless).

## 2. Data Strategy
* **Live Database:** All critical data is stored in DynamoDB tables with `WTN_` prefix.
    - `WTN_Participants`: Student progress, scores, and disqualification status.
    - `WTN_Questions`: Exam content (answer keys redacted on server).
    - `WTN_Schools`: Allowed schools and domains.
    - `WTN_Sessions`: Exam windows and school assignments.
* **Environment Variables:** `WTN_AWS_ACCESS_KEY_ID`, `WTN_AWS_SECRET_ACCESS_KEY`, `WTN_AWS_REGION` used for SDK initialization.

## 3. Component Architecture
* **`QuizContainer`**: Handles state, strike logic, and question indexing.
* **`QuestionCard`**: Stateless component for rendering MCQ options.
* **`StrikeModal`**: High-priority overlay for cheating warnings.

## 4. Logic Implementation
* **Session Management**: Login window opens 30 mins before `WTN_Sessions.startTime`. Logic handled in `src/app/page.tsx` and `src/app/lobby/page.tsx`.
* **Strike System**: Global `useEffect` attaches listeners for `visibilitychange`. 3 strikes = `isDisqualified: true` in `WTN_Participants`.
* **Anti-Sabotage**: DynamoDB Conditional Writes ensure only one active session per email/school pair.

## 5. Deployment Pipeline
* **Build Spec**: `amplify.yml` handles dependency installation (`npm ci`) and builds the Next.js app (`npm run build`).
* **Environment Injection:** Sensitive variables are written to `.env.production` during the Amplify `preBuild` phase to ensure server-side access at runtime.

## 6. INFRASTRUCTURE & DNS
* **DNS Provider:** AWS Route 53.
    * **Resolution:** Solved infinite spinning/SSL handshake issues on root domain by migrating away from Vodien.
    * **Configuration:** Root (`@`) and `www` are configured as A (Alias) records targeting the Amplify distribution.
* **Compute Platform:** AWS Amplify Managed Next.js (`WEB_COMPUTE`).
    * **Role:** Automatically manages serverless compute for SSR and API routes.
    * **Benefit:** Zero manual Lambda management; seamless scaling for Next.js App Router.
