import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, ChevronDown, ChevronUp, Loader2, Volume2 } from "lucide-react";
import VoiceWave from "@/components/VoiceWave";
import GlassCard from "@/components/GlassCard";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "Interview — OrionAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ type: (s.type as string) || "behavioral" }),
  component: InterviewPage,
});

type Status = "listening" | "thinking" | "speaking" | "connecting";

function InterviewPage() {
  const navigate = useNavigate();
  const { type } = useSearch({ from: "/_authenticated/interview" });
  
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<Status>("connecting");
  const [seconds, setSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [thinkingText, setThinkingText] = useState("thinking");

  const activeRecognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // Prevents garbage collection cutoffs
  const isSpeakingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Safety fallback for browser bugs
  const hasStartedRef = useRef(false); // Prevents duplicate calls in StrictMode

  // Refs to keep track of the latest state in the event listeners
  const statusRef = useRef<Status>("connecting");
  const mutedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (status === "thinking") {
      setThinkingText("AI is thinking...");
      
      const t1 = setTimeout(() => {
        setThinkingText("Gemini rate limit reached. Retrying...");
      }, 5000); // After 5 seconds (1st retry)
      
      const t2 = setTimeout(() => {
        setThinkingText("Still retrying, please wait...");
      }, 15000); // After 15 seconds (2nd retry)

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setThinkingText("thinking");
    }
  }, [status]);

  // Stops any active speech recognition instance
  const stopListening = () => {
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.onend = null; // Prevent recursion on abort
        activeRecognitionRef.current.abort();
      } catch (e) {}
      activeRecognitionRef.current = null;
    }
  };

  // Starts a fresh speech recognition instance
  const startListening = () => {
    if (typeof window === "undefined") return;
    
    stopListening(); // Clean up any existing instance first

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Your browser does not support Speech Recognition. Please use Google Chrome.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setStatus("listening");
      };

      rec.onresult = async (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (!resultText.trim()) return;

        // Add user message to transcript and transition to thinking
        setTranscript((prev) => [...prev, { role: "user", text: resultText }]);
        setStatus("thinking");
        stopListening();

        try {
          const currentSessionId = window.localStorage.getItem("current_session_id");
          if (!currentSessionId) throw new Error("No active session");

          // Send response to backend
          const { data } = await api.post("/interview/message", {
            sessionId: currentSessionId,
            message: resultText,
          });

          if (data.isEnded) {
            toast.success("Interview completed!");
            if (synthRef.current) synthRef.current.cancel();
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
            navigate({ to: `/feedback/${currentSessionId}` });
          } else {
            // Add AI response and speak it
            setTranscript((prev) => [...prev, { role: "ai", text: data.message }]);
            speakText(data.message);
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.error || "Failed to send answer. Please try again.");
          setStatus("listening");
          startListening(); // Restart listening on error
        }
      };

      rec.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          toast.error("Microphone access blocked! Please enable microphone permissions in your browser.");
        } else if (event.error !== "no-speech") {
          console.error("Speech recognition error:", event.error);
        }
      };

      rec.onend = () => {
        // Restart listening with a fresh instance if we are still in listening mode and not muted
        if (statusRef.current === "listening" && !mutedRef.current) {
          startListening();
        }
      };

      activeRecognitionRef.current = rec;

      if (!mutedRef.current) {
        rec.start();
      }
    } catch (e) {
      console.error("Failed to initialize SpeechRecognition:", e);
    }
  };

  // Text-to-Speech function
  const speakText = (text: string) => {
    if (!synthRef.current) return;

    // Clear any existing safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    // Stop listening before speaking
    stopListening();

    // Cancel any ongoing speech and set status
    synthRef.current.cancel();
    isSpeakingRef.current = true;
    setStatus("speaking");

    // Yield control to the browser's event loop to prevent Chrome SpeechSynthesis engine lockup
    setTimeout(() => {
      if (!synthRef.current) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; // Keep reference to prevent garbage collection!
      
      // Choose a natural English voice if available
      const voices = synthRef.current.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Google")
      ) || voices.find((v) => v.lang.startsWith("en"));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      utterance.rate = 1.05; // Slightly faster for natural pacing
      utterance.pitch = 1.0;

      const handleSpeechEnd = () => {
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current);
          safetyTimeoutRef.current = null;
        }
        isSpeakingRef.current = false;
        utteranceRef.current = null;
        setStatus("listening");
        if (!mutedRef.current) {
          startListening();
        }
      };

      utterance.onend = handleSpeechEnd;

      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          console.error("Speech synthesis error:", e);
        }
        handleSpeechEnd();
      };

      // Safety timeout fallback: if onend doesn't fire (browser bug), trigger it manually
      const wordCount = text.split(/\s+/).length;
      const estimatedDurationMs = Math.max(4000, wordCount * 500 + 2500); // 500ms per word + 2.5s buffer
      
      safetyTimeoutRef.current = setTimeout(() => {
        if (isSpeakingRef.current && statusRef.current === "speaking") {
          console.warn("⚠️ Speech synthesis onend did not fire in time. Triggering safety fallback.");
          handleSpeechEnd();
        }
      }, estimatedDurationMs);

      synthRef.current.speak(utterance);
    }, 100);
  };

  // Initialize Speech Synthesis (Once on Mount)
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      stopListening();
    };
  }, []);

  // Start the interview session on mount
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startSession = async () => {
      try {
        const { data } = await api.post("/interview/start", {
          type: type.toUpperCase().replace("-", "_"),
        });

        setSessionId(data.sessionId);
        window.localStorage.setItem("current_session_id", data.sessionId);
        
        setTranscript([{ role: "ai", text: data.openingMessage }]);
        
        // Speak the opening message
        speakText(data.openingMessage);
        
        // Start Timer
        timerRef.current = setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to start interview session");
        navigate({ to: "/dashboard" });
      }
    };

    startSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [type]);

  // Handle Mute/Unmute changes & Interrupting the AI
  const handleMicClick = () => {
    if (status === "speaking") {
      // Interrupt the AI and start listening immediately
      if (synthRef.current) synthRef.current.cancel();
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      isSpeakingRef.current = false;
      utteranceRef.current = null;
      setMuted(false);
      setStatus("listening");
      startListening();
      toast.success("AI interrupted. You can speak now!");
    } else {
      const nextMuted = !muted;
      setMuted(nextMuted);
      if (nextMuted) {
        stopListening();
        if (status === "listening") {
          setStatus("speaking"); // Visual state change
        }
      } else {
        if (status === "speaking" && !isSpeakingRef.current) {
          setStatus("listening");
          startListening();
        }
      }
    }
  };

  const time = useMemo(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  const endInterview = async () => {
    try {
      if (synthRef.current) synthRef.current.cancel();
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      stopListening();

      const currentSessionId = sessionId || window.localStorage.getItem("current_session_id");
      if (!currentSessionId) throw new Error("No active session");

      toast.loading("Ending interview and generating report...");
      
      const { data } = await api.post(`/interview/end/${currentSessionId}`);
      
      toast.dismiss();
      toast.success("Feedback report generated!");
      navigate({ to: `/feedback/${currentSessionId}` });
    } catch (err: any) {
      toast.dismiss();
      toast.error("Failed to generate report, redirecting to dashboard.");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-10">
      <div className="glass flex w-full items-center justify-between rounded-2xl px-5 py-3">
        <div className="text-sm uppercase tracking-widest text-muted-foreground">
          {type.replace("-", " ")} interview
        </div>
        <div className="font-mono text-sm">{time}</div>
      </div>

      <div className="relative mt-12">
        <motion.div
          animate={{ scale: status === "speaking" ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="relative"
        >
          <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] border border-white/10 glow md:h-64 md:w-64">
            {status === "connecting" ? (
              <Loader2 className="h-24 w-24 text-white animate-spin md:h-32 md:w-32" />
            ) : (
              <img src="/bot.png" alt="AI Agent" className="h-full w-full object-cover animate-pulse" style={{ animationDuration: status === "speaking" ? "1.5s" : "4s" }} />
            )}
          </div>
          <div className="absolute -inset-6 rounded-full border border-white/10 animate-pulse" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mt-6 text-sm uppercase tracking-widest text-center"
        >
          <span className={
            status === "listening" ? "text-[oklch(0.75_0.18_180)] font-medium animate-pulse" :
            status === "thinking" ? "text-[oklch(0.75_0.2_300)] font-medium animate-pulse" :
            status === "connecting" ? "text-muted-foreground animate-pulse" :
            "text-[oklch(0.75_0.2_255)] font-medium"
          }>
            {status === "thinking" ? thinkingText : status}
          </span>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 w-full max-w-2xl">
        <VoiceWave status={status} active={!muted && status === "listening"} />
      </div>

      {status === "speaking" && !muted && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
          <Volume2 className="h-4 w-4 text-indigo-400 animate-bounce" /> Speaking... (Click mic to interrupt)
        </div>
      )}

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleMicClick}
          disabled={status === "connecting" || status === "thinking"}
          className={`glass flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50 transition-all ${
            status === "speaking" ? "border-indigo-500/50 text-indigo-400" : ""
          }`}
          aria-label="Toggle mute or interrupt"
          title={status === "speaking" ? "Click to interrupt and answer" : "Toggle mute"}
        >
          {muted ? <MicOff className="h-5 w-5 text-rose-400" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          onClick={endInterview}
          disabled={status === "connecting" || status === "thinking"}
          className="flex items-center gap-2 rounded-full bg-rose-500/90 px-6 py-3 font-medium text-white hover:bg-rose-500 disabled:opacity-50"
        >
          <PhoneOff className="h-4 w-4" /> End interview
        </button>
      </div>

      <button
        onClick={() => setShowTranscript((v) => !v)}
        className="mt-10 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showTranscript ? "Hide transcript" : "Show transcript"}
      </button>

      {showTranscript && (
        <GlassCard className="mt-4 w-full max-w-2xl">
          <div className="space-y-3 text-sm max-h-60 overflow-y-auto pr-2">
            {transcript.map((t, i) => (
              <div key={i} className="flex gap-3">
                <span className={`min-w-12 text-xs uppercase tracking-widest ${t.role === "ai" ? "gradient-text" : "text-muted-foreground"}`}>
                  {t.role === "ai" ? "AI" : "You"}
                </span>
                <p className="flex-1 text-left">{t.text}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}