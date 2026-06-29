---
title: OrionAI Backend
emoji: 🤖
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# OrionAI Backend

Welcome to the backend server of **OrionAI**, an AI-powered Mock Interview Platform. It leverages **LangGraph**, **Groq** (primary conversational LLM), **Gemini 2.5 Flash** (evaluation LLM), **LiveKit Cloud**, and **Prisma ORM with Neon PostgreSQL** to deliver a dynamic, voice-driven mock interview experience.

## Tech Stack
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **AI Orchestration**: LangGraph (`@langchain/langgraph` + `@langchain/core`)
- **LLMs**: Groq (primary conversational LLM) + Gemini 2.5 Flash (evaluation/structured report LLM)
- **Voice Session Management**: LiveKit Cloud (`livekit-server-sdk`)
- **Security & Logging**: Helmet, CORS, Express Rate Limit, Morgan, BCryptJS, JSONWebTokens

---

## ⚡ Local Setup (Under 5 Commands)

To run the backend server locally, execute the following commands in your terminal:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Synchronize database schema (Ensure DATABASE_URL is set in .env)
npx prisma db push

# 4. Start the development server
npm run dev
```

---

## 🔑 Environment Variables (`.env`)

Create a `.env` file in the `backend` root directory and configure the following variables:

```env
PORT=5000
NODE_ENV="development"

# Database
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"

# Security
JWT_SECRET="your_jwt_signing_key_here"

# LLMs
GEMINI_API_KEY="your_gemini_api_key_here"
GROQ_API_KEY="your_groq_api_key_here"

# LiveKit
LIVEKIT_API_KEY="your_livekit_api_key"
LIVEKIT_API_SECRET="your_livekit_api_secret"
LIVEKIT_URL="wss://your-livekit-project.livekit.cloud"

# Interview Configuration
MAX_QUESTIONS_PER_SESSION=5
```

---

## 🛠️ API Documentation

### Authentication (Public / Rate-Limited)
- **`POST /api/auth/signup`**: Create a new candidate profile.
  - *Body*: `{ "email", "password", "name", "jobRole", "experienceLevel" }`
- **`POST /api/auth/login`**: Sign in and receive a JWT.
  - *Body*: `{ "email", "password" }`

### Profile (Protected)
- **`GET /api/profile`**: Get current candidate profile.
- **`PUT /api/profile`**: Update candidate profile.
  - *Body*: `{ "name", "jobRole", "experienceLevel" }` (All optional)

### Mock Interviews (Protected)
- **`POST /api/interview/start`**: Start a new session, create a LiveKit room, and generate the first question.
  - *Body*: `{ "type": "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "HR_CULTURE_FIT" }`
  - *Response*: `{ "sessionId", "livekitRoom", "livekitToken", "openingMessage" }`
- **`POST /api/interview/message`**: Submit a candidate's answer transcript. The LangGraph evaluates the answer and determines if it should follow up, increase difficulty, ask a new question, or generate the final report.
  - *Body*: `{ "sessionId", "message" }`
  - *Response*: `{ "isEnded", "message", "feedback" }`
- **`POST /api/interview/end`**: Manually end an ongoing interview session and generate the report immediately.
  - *Body*: `{ "sessionId" }` (or via path `/api/interview/end/:id`)
- **`GET /api/interview/:id`**: Get details and conversation history of a specific session.
- **`GET /api/history`**: Get all past interview sessions for the candidate.
- **`GET /api/report/:id`**: Get the feedback report for a completed session (uses session ID).

---

## 📐 LangGraph Workflow

The conversation engine uses a state-driven graph built with **LangGraph** to process candidate answers and determine the next logical turn:

```
[START]
   ↓
[Entry Router] ── (No Messages) ──→ [Generate Intro & Q1] ──→ [END TURN]
   ↓ (Has Messages)
[Evaluate Answer] (Gemini JSON)
   ↓
[Decide Next Step] (Router)
   ├── (Weak Answer) ──────→ [Generate Follow-up] ──────→ [END TURN]
   ├── (Strong Answer) ────→ [Increase Difficulty] ─────→ [Generate Question] ──→ [END TURN]
   └── (Target Reached?)
            ├── No ────────→ [Generate Question] ───────→ [END TURN]
            └── Yes ───────→ [Generate Final Report] ──→ [END SESSION]
```
