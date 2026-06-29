# Local Setup Guide

This guide describes how to run the entire **OrionAI** platform locally.
---

## 🚀 Run Locally in 4 Commands

### 1. Start the Backend
Open a terminal in the project root and run:

```bash
# Command 1: Install backend dependencies
cd backend && npm install

# Command 2: Start the backend server
npm run dev
```
*The backend will run on `http://localhost:5000`.*

### 2. Start the Frontend
Open a **new, separate terminal** in the project root and run:

```bash
# Command 3: Install frontend dependencies
cd "Frontend" && npm install

# Command 4: Start the frontend Vite server
npm run dev
```
*The frontend website will run on `http://localhost:5173`.*

---

## 🔑 Environment Variables (.env)
Make sure you have a `.env` file inside the `backend/` directory with the following keys:

```env
PORT=5000
DATABASE_URL="your-neon-postgres-url"
JWT_SECRET="your-jwt-secret-key"
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"
LIVEKIT_URL="wss://your-livekit-project.livekit.cloud"
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-api-secret"
```
