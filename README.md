# Aarohan 🧘

> **Universal Predictive Mental Wellness Intelligence Platform**

Aarohan is a GenAI-powered mental wellness platform designed to discover hidden stress triggers, forecast burnout before it happens, maintain a personalized behavioral memory (Wellness Digital Twin), and generate closed-loop recovery recommendations for students, founders, professionals, and caregivers alike.

---

## 🌟 Core Innovations & Moat

Aarohan moves digital wellness from **reactive mood logging** to **proactive predictive intelligence** through four main mechanisms:

1. **Wellness Digital Twin (Memory Layer):** Models emotional causality by mapping `Events → Emotions → Behaviors → Interventions → Outcomes` into normalized Firestore events, mapping how users react and recover over time.
2. **6-Factor Burnout Risk Score (BRS):** A deterministic local calculation using real-time and temporal user signals:
   $$\text{BRS} = (0.25 \times \text{NegTrend}) + (0.20 \times \text{StressGrowth}) + (0.15 \times \text{Volatility}) + (0.15 \times \text{RecoveryDelay}) + (0.15 \times \text{EngagementDrop}) + (0.10 \times \text{TriggerIntensity})$$
3. **Context-Aware Retrieval Chat (Aarohi):** A chat interface that queries the user's active triggers, BRS risk level, and historical intervention effectiveness to build a customized system prompt before executing Gemini API calls.
4. **Deterministic Hybrid Pipeline:** Leverages Gemini strictly for unstructured content parsing (extracting semantic events and emotion indicators) while keeping calculations local and reproducible to prevent LLM drift.
5. **Unified Event Taxonomy:** Translates and groups user-generated events into standardized categories (`ACADEMICS`, `WORK`, `FINANCE`, `HEALTH`, `RELATIONSHIPS`) to simplify correlation logic.

---

## 🛠️ Technology Stack

* **Frontend:** React, Vite, Tailwind CSS, Recharts (lightweight bundle targeting $<5$ MB).
* **Backend:** FastAPI, Python, Uvicorn, SlowAPI (rate limiting).
* **Database & Auth:** Google Firestore, Firebase Auth (Client & Admin SDKs).
* **AI Engine:** Google Gemini API (`gemini-1.5-flash` / `gemini-2.5-flash`).
* **Hosting / Compliancy:** Google Cloud Run and Vercel-compliant serverless routing configurations.

---

## 📂 Project Structure

```
aarohan/
├── backend/                        # FastAPI Service Layer
│   ├── app/
│   │   ├── api/                    # Route endpoints (Onboarding, Journals, Chat, Dashboard)
│   │   ├── core/                   # Firebase config, rates and secrets validation
│   │   ├── models/                 # Pydantic schemas
│   │   └── services/               # Gemini extraction, scoring formulas, Digital Twin mapping
│   ├── tests/                      # pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── components/             # Reusable widgets (Visual timelines, recording gauges)
│   │   ├── context/                # Global session state (AuthContext)
│   │   ├── pages/                  # Views (Dashboard, Multi-Persona Onboarding, Chat)
│   │   └── services/               # API clients (Axios) & Firebase initialization
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── api/
│   └── index.py                    # Vercel serverless integration entrypoint
├── vercel.json                     # Vercel deployment routing config
├── .gitignore
├── .env.example
└── README.md
```

---

## 🚀 Local Setup & Installation

### Prerequisite Configuration

1. Create a Firebase Project on the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password) and **Firestore Database**.
3. Obtain your web client credentials and create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id

# Client Configs
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

---

### Running the Backend (FastAPI)

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Access the API documentation at `http://localhost:8000/docs`.

---

### Running the Frontend (React + Vite)

1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install npm modules:
   ```bash
   npm install
   ```
3. Launch Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`.

---

## 🛡️ Security & Privacy Guardrails

* **Firebase Authentication:** Validates Bearer tokens on every protected backend route.
* **Firestore Caching:** Utilizes a custom `user_analytics` collection containing pre-compiled timelines and trigger indices, decreasing query reads and database loading to under 1 second.
* **4-Tier Crisis Action Matrix:**
  * **Level 1 (High Stress):** Proposes breathing and mindfulness routines.
  * **Level 2 (Burnout Risk):** Recommends study-rest adjustments.
  * **Level 3 (Distress Warning):** Provides active peer connections.
  * **Level 4 (Self-Harm Alerts):** Automatically locks chat session, presents emergency helpline information (AASRA, Vandrevala), and displays direct crisis hotline interfaces.
* **Privacy Toggle Actions:** Toggling off AI analysis or data retention directly limits Firestore collection logging to support user anonymity.
