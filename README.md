# OrionAI — AI-Powered Mock Interviewer

OrionAI is a production-grade, voice-native mock interview platform designed to help candidates practice and ace their interviews. It features a real-time, low-latency conversational AI interviewer that conducts mock sessions across multiple tracks, evaluates candidate responses, and provides deep, recruiter-grade analytics.

---

## 🌟 Key Features

*   **🎙️ Voice-Native Mock Interviews**: A low-latency, real-time voice interface powered by **LiveKit WebRTC** that simulates a real face-to-face or audio interview.
*   **🧠 Agentic Conversation Engine**: Built using **LangGraph**, the AI interviewer dynamically adapts the interview flow, asks follow-up questions, adjusts difficulty, and concludes the session based on the candidate's responses.
*   **📁 Multiple Interview Tracks**:
    *   **Technical**: Coding concepts, algorithms, and system design.
    *   **Behavioral**: STAR method evaluation.
    *   **System Design**: High-level architecture and scalability.
    *   **HR / Culture Fit**: Alignment, values, and soft skills.
*   **📊 Analysis Dashboard**: Compare performance across multiple past sessions using interactive **Recharts** line charts to track progress, strengths, weaknesses, and targeted improvement suggestions.
*   **🔑 JWT Authentication**: Secure sign-up, login, and profile management (university, experience level, target job roles).
*   **📅 Advanced History Filtering**: Search past sessions, filter by track, and filter by custom date ranges using a built-in calendar picker.

---

## 🛠️ Technology Stack

### 💻 Frontend (Client)
*   **Framework**: React 19 + Vite 8
*   **Routing**: TanStack Router & TanStack Start (fully type-safe routing)
*   **State Management**: TanStack React Query
*   **Styling**: Tailwind CSS v4 + Radix UI Primitives
*   **Animations**: Framer Motion 12
*   **Charts**: Recharts

### ⚙️ Backend (Server)
*   **Runtime**: Node.js (TypeScript) + Express.js
*   **Database**: Neon PostgreSQL
*   **ORM**: Prisma ORM
*   **Real-Time Audio**: LiveKit Server SDK (WebRTC)
*   **Security**: JSON Web Tokens (JWT) + BCryptJS

### 🧠 AI & LLM Architecture
*   **Orchestration**: LangGraph (`@langchain/langgraph` + `@langchain/core`)
*   **Conversational LLM**: **Groq API** (Llama-3 for ultra-low-latency conversation)
*   **Evaluation LLM**: **Google Gemini 2.5 Flash** (for deep, structured feedback reports)

---

## 📁 Project Structure

```text
OrionAI/
├── Frontend/             # React client application (Vite, Tailwind, TanStack)
├── backend/              # Node.js Express server (Prisma, LangGraph, LiveKit)
├── LOCAL_SETUP.md        # 4-command quick start guide
└── README.md             # Main project documentation
```

---

## 🚀 Quick Local Start

To run the entire platform locally, follow these 4 simple steps:

### 1. Set up the Backend
```bash
# 1. Install backend dependencies
cd backend && npm install

# 2. Start the backend server
npm run dev
```
*The backend will run on `http://localhost:5000`.*

### 2. Set up the Frontend
Open a **new terminal** and run:
```bash
# 3. Install frontend dependencies
cd Frontend && npm install

# 4. Start the frontend Vite server
npm run dev
```
*The frontend website will run on `http://localhost:5173`.*

> [!NOTE]
> Ensure you have configured your `.env` file in the `backend/` directory. Refer to [LOCAL_SETUP.md](file:///c:/Users/Shlok%20Agarwal/Desktop/OrionAI/LOCAL_SETUP.md) for the required environment variables.

---

## 🌐 Production Deployment

### 1. Backend (Hugging Face Spaces)
The backend is Dockerized and ready for Hugging Face:
*   **SDK**: Docker (Blank template)
*   **Port**: `7860` (automatically exposed by our `Dockerfile`)
*   **Deployment Command**:
    ```bash
    git subtree push --prefix backend hf main
    ```

### 2. Frontend (Vercel)
*   **Framework Preset**: Vite
*   **Root Directory**: `Frontend`
*   **Environment Variable**: Set `VITE_API_URL` to your Hugging Face Space URL (e.g., `https://your-space-name.hf.space/api`).