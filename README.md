# CogniCSE: Intelligent 1-on-1 Pedagogical Closed-Loop Learning Support System

CogniCSE is a full-stack, pedagogical 1-on-1 learning platform engineered for Computer Science & Engineering (CSE) and Mechanical Engineering (CAD) students. Rather than functioning as a direct code/answer generator, CogniCSE acts as a strict Socratic tutor enforcing an **Anti-Answer Protocol**, continuous **Bayesian Knowledge Tracing (BKT)**, an **Individual Student Learning Model (ISLM)**, an **SM-2 / Leitner spaced repetition review loop**, and live instructor telemetry.

---

## 1. Architecture Diagram of the Closed Loop

```
+---------------------------------------------------------------------------------------------------+
|                                      STUDENT WORKSPACE                                            |
|                                                                                                   |
|  [ Polyglot Sandbox / CAD Lab / Web Dev Lab / Diagnostic Mock Test / Socratic Chat / Live Class ]  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  | Student Action / Solution Attempt / Code / Recall
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  PEDAGOGICAL EVENT BUS (/api/events)                              |
|                                                                                                   |
|  * Timestamped, immutable audit log of every observation, hint request, attempt, and diagnostic   |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                         COGNITIVE MODELING & BAYESIAN KNOWLEDGE TRACING                           |
|                                                                                                   |
|  * Bayesian Knowledge Tracing (BKT): Updates concept posterior p(L_t | obs)                       |
|  * Slip (S=0.10), Guess (G=0.20), Transit (T=0.15), Clamped to [0.01, 0.99]                       |
|  * Status categorization: GREEN (>=0.80), YELLOW (0.50-0.79), RED (<0.50)                        |
|  * Composite Mastery: Conceptual (35%) + Practical (35%) + Independent (20%) + Retention (10%)     |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                        INDIVIDUAL STUDENT LEARNING MODEL (ISLM Profile)                           |
|                                                                                                   |
|  * Tracks topic masteries, recurrent misconception patterns, and Scaffolding Fading Index        |
|  * Calculates at-risk flags (>= 3 RED nodes or no independent success in 7 days)                  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
                         v                                                 v
+-----------------------------------------------+ +-----------------------------------------------+
|       ADAPTIVE SOCRATIC SCAFFOLDING           | |        SPACED REPETITION ENGINE (RETAIN)      |
|                                               | |                                               |
|  * Tier 1: Metacognitive Hint                 | |  * SM-2 Algorithm (EF, interval calculation)  |
|  * Tier 2: Conceptual Guidance                | |  * Leitner 4-Box Scheduling:                  |
|  * Tier 3: Socratic Micro-Drill               | |    - Box 1: Daily                             |
|  * Tier 4: Direct Line Guidance (No Answers!) | |    - Box 2: 3 Days                            |
|  * Anti-Answer Shield active                  | |    - Box 3: 7 Days                            |
|  * Multilingual: English, Tamil, Hindi        | |    - Box 4: Mastered                          |
|  * Provenance: [LIVE AI] or [FALLBACK]        | |  * Successful delayed recall activates        |
|                                               | |    the 10% Retention component in mastery!    |
+-----------------------------------------------+ +-----------------------------------------------+
                         |                                                 |
                         +------------------------+------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                            INSTRUCTOR CONSOLE & EMPIRICAL STUDY SUITE                             |
|                                                                                                   |
|  * Live Cohort Heatmap (% of students at GREEN per DKM node)                                      |
|  * Per-Student Drill-down (BKT traces, error trajectories, assistance requests, time on task)     |
|  * Empirical Study Engine: 3-Arm randomized trials (A: Closed-Loop, B: Generic AI, C: Control)   |
|  * Formal Statistics: Paired & Welch t-tests, Cohen's d, Hedges' g, 95% CIs via Incomplete Beta  |
|  * Provenance: [STUDY DATA] vs [DEMO DATA (synthetic)]                                            |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Core Data Models

The system persists state on the server in atomic JSON files (`server/store.json`):

### 1. `DKMNode` (Domain Knowledge Map)
```typescript
interface DKMNode {
  id: string;
  name: string;
  track: 'Data Structures & Algorithms' | 'Web Application Development' | 'Operating Systems' | 'Computer Networks' | 'Mechanical Engineering (CAD)';
  category: string;
  description: string;
  keyConcept: string;
  typicalTrap: string;
  starterCodeSnippet: string;
  codeLanguage: SupportedLanguage;
  starterErrorLog: string;
  prerequisites: string[];
  status: 'GREEN' | 'YELLOW' | 'RED' | 'NOT_ASSESSED';
  mastery: number; // 0.0 to 1.0 (pL)
  errorCount: number;
  solvedCount: number;
  bktTrace?: BKTTrace[];
  compositeMastery?: CompositeMasteryBreakdown;
}
```

### 2. `PedagogicalEvent`
```typescript
interface PedagogicalEvent {
  id: string;
  timestamp: string;
  studentId: string;
  type: 'OBSERVATION_RECORDED' | 'ATTEMPT_RECORDED' | 'HINT_REQUESTED' | 'TUTORING_INTERACTION' | 'STUDY_EVENT' | 'RETAIN_REVIEW';
  conceptId: string;
  topicId: string;
  payload: Record<string, any>;
  synthetic: boolean; // Flagged true when generated by demo cohort seeder
}
```

### 3. `SpacedReviewCard`
```typescript
interface SpacedReviewCard {
  id: string;
  conceptId: string;
  studentId: string;
  leitnerBox: 1 | 2 | 3 | 4;
  easeFactor: number; // Initial 2.5, minimum 1.3
  intervalDays: number;
  repetitions: number;
  dueDate: string; // ISO timestamp
  lastReviewed?: string;
  question: Record<'en' | 'ta' | 'hi', string>;
  answerSummary: Record<'en' | 'ta' | 'hi', string>;
}
```

---

## 3. How Metrics Are Computed

### Bayesian Knowledge Tracing (BKT)
- Given prior mastery $P(L_{t-1})$:
  - If observation is correct:
    $$P(L_t | \text{correct}) = \frac{P(L_{t-1})(1 - S)}{P(L_{t-1})(1 - S) + (1 - P(L_{t-1}))G}$$
  - If observation is incorrect:
    $$P(L_t | \text{incorrect}) = \frac{P(L_{t-1})S}{P(L_{t-1})S + (1 - P(L_{t-1}))(1 - G)}$$
  - Transition update:
    $$P(L_t) = P(L_t | \text{obs}) + (1 - P(L_t | \text{obs}))T$$
- Default parameters: $S = 0.10$ (slip), $G = 0.20$ (guess), $T = 0.15$ (transition). Values are strictly clamped between $[0.01, 0.99]$.

### Composite Mastery Formula
- When retention data is present:
  $$\text{Composite} = \text{round}(0.35 \times \text{Conceptual} + 0.35 \times \text{Practical} + 0.20 \times \text{Independent} + 0.10 \times \text{Retention})$$
- When retention data is absent, weights renormalize proportionally ($0.3889 / 0.3889 / 0.2222$) without inventing artificial figures.

### Statistical Analysis Suite (`src/utils/statistics.ts`)
- **Normalized Learning Gain (Hake's $g$)**:
  $$g = \frac{\text{Post} - \text{Pre}}{100 - \text{Pre}}$$
- **Student's $t$ Distribution**: Computed via the regularized incomplete beta function $I_x(a,b)$ using continued fraction expansions. Verified test: $t = 2.262, df = 9 \implies p \approx 0.05$.
- **Welch $t$-test**: Degrees of freedom adjusted via the Welch–Satterthwaite equation for unequal arm variances.
- **Effect Sizes**: Cohen's $d$ and Hedges' $g$ correction factor $J(df) = 1 - \frac{3}{4 df - 1}$.
- **Small Sample Caution**: Whenever arm sample size $n < 30$, a prominent caution banner advises interpreting effect sizes and 95% confidence intervals over raw asymptotic p-values.

---

## 4. How to Run the Pilot Study with 10 Students

1. Open the **Empirical Study** workflow (`/api/studies`).
2. Click **Create New Study** and select a topic (e.g., *Deadlock Conditions* or *PDO MySQL Port Binding*).
3. Set up the arms:
   - **Arm A (Personalised Closed-Loop)**: Full ISLM, BKT tracking, 4-tier Socratic scaffolding, Anti-Answer protocol.
   - **Arm B (Generic Assistant)**: Direct solutions, no Socratic scaffolding, same base LLM.
   - **Arm C (Control)**: Unguided reference library.
4. **Seed or Enroll Cohort**:
   - For empirical evaluation with 10 students per arm, click **"Seed Demo Cohort (30 Students)"**.
   - Synthetic participants will be generated with full event histories across Pre-test, Learning, Post-test, and Delayed Retention test.
   - A permanent banner clearly indicates: **`DEMO DATA (synthetic): not measured results`**.
5. **Analyze Results**:
   - Inspect Pre vs Post gain comparisons, Welch $t$-test values, Cohen's $d$, and time-to-completion metrics.
   - Export full raw events and analytical summaries via **Export CSV** or **Export JSON**.
   - Deleting or adding events instantly re-evaluates all statistical metrics from raw data.

---

## 5. System Limitations

1. **Simulated Environments**:
   - The Web Dev Lab uses a client-side virtual filesystem with an emulated terminal and mock MySQL/Apache services rather than root Docker containers.
2. **Rule-Checked Languages**:
   - Sandboxes for languages other than JavaScript/Python (e.g., C, C++, Go, Rust, PHP) run structural AST and rule-based diagnostic test suites in the browser rather than a sandboxed Linux kernel.
3. **Closed-Form FEA & CAD**:
   - The CAD lab executes closed-form mechanical engineering approximations (Euler-Bernoulli cantilever beam equations, Von Mises yield stress, and ISO stress concentration factor tables) rather than 3D volumetric finite element tetrahedral meshing.
4. **Engagement Proxies**:
   - Engagement telemetry relies on browser webcam gaze estimation (FaceMesh landmarks), tab visibility changes, and keyboard/mouse interaction cadence, rather than medical-grade eye tracking or EEG sensors. All synthetic sensors display the `[SIMULATED]` provenance badge.

---

## 6. Responsible AI Policy

- **Anti-Answer Protocol**: In learning workflows, the tutor will never output verbatim code solutions, final numerical answers, or direct assignment fixes. If prompted for direct solutions, it politely refuses and provides a Socratic hint.
- **Strict Provenance Badging**:
  - `[LIVE AI]`: Responses generated directly by Gemini 2.5 Flash via server-side API.
  - `[FALLBACK]`: Deterministic pedagogical rules engaged when offline or under API timeouts.
  - `[STUDY DATA]`: Metrics computed from real student user sessions.
  - `[DEMO DATA (synthetic)]`: Synthetically seeded demonstration records.
  - `[REAL SENSOR]`: Direct hardware sensor streams.
  - `[SIMULATED]`: Simulated synthetic telemetry.
- **Privacy & Security**: All API keys remain strictly server-side (`process.env.GEMINI_API_KEY`). Student data is isolated and stored with atomic file writes.

---

## 7. Known Issues & Verification

- **HMR in Cloud Run Preview**: Vite HMR WebSockets are automatically shimmed in `index.html` to avoid connection noise in proxied environments.
- **Pre-computed Mesh Coordinates**: Complex STEP/IGES CAD model imports are approximated with Three.js parametric geometries.
- **All 51 Unit Tests Pass**: Run `npm test` to verify statistics, SM-2 retention, BKT, and virtual labs.
- **Lint & Build Clean**: `npm run lint` and `npm run build` execute with 0 errors.
