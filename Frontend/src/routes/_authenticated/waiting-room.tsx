import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, Volume2, Wifi, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/waiting-room")({
  head: () => ({ meta: [{ title: "Waiting Room — OrionAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ type: (s.type as string) || "behavioral" }),
  component: WaitingRoomPage,
});

function WaitingRoomPage() {
  const navigate = useNavigate();
  const { type } = useSearch({ from: "/_authenticated/waiting-room" });
  const [mic, setMic] = useState<"unknown" | "ok" | "fail">("unknown");
  const [spk, setSpk] = useState<"unknown" | "ok" | "fail">("unknown");
  const [net, setNet] = useState<"ok" | "fail">("ok");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setNet(navigator.onLine ? "ok" : "fail");
    }
  }, []);

  const checkMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMic("ok");
      toast.success("Microphone is working");
    } catch {
      setMic("fail");
      toast.error("Could not access microphone");
    }
  };

  const checkSpk = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        
        // Soft gain with smooth fade-out
        gain.gain.setValueAtTime(0.06, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      // Arpeggio chime: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
      playTone(523.25, now, 0.4);
      playTone(659.25, now + 0.12, 0.5);
      playTone(783.99, now + 0.24, 0.6);
      
      // Speak confirmation message after the chime
      if (typeof window !== "undefined" && window.speechSynthesis) {
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("Audio test successful. Your speakers are working perfectly.");
          const voices = window.speechSynthesis.getVoices();
          const englishVoice = voices.find(
            (v) => v.lang.startsWith("en") && v.name.includes("Google")
          ) || voices.find((v) => v.lang.startsWith("en"));
          
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
          utterance.rate = 1.02;
          window.speechSynthesis.speak(utterance);
        }, 450);
      }
      
      setSpk("ok");
    } catch {
      setSpk("fail");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Waiting room</h1>
        <p className="text-muted-foreground">Track: <span className="gradient-text font-semibold capitalize">{type.replace("-", " ")}</span></p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Check label="Microphone" icon={Mic} status={mic} action={checkMic} actionLabel="Test mic" />
        <Check label="Speakers" icon={Volume2} status={spk} action={checkSpk} actionLabel="Play tone" />
        <Check label="Connection" icon={Wifi} status={net === "ok" ? "ok" : "fail"} />
      </div>

      <GlassCard className="mt-6">
        <h3 className="font-semibold">Before you begin</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Find a quiet space and speak naturally — the AI will listen and respond.</li>
          <li>• You can pause or end the interview at any time.</li>
          <li>• A full transcript and detailed report will be available after the session.</li>
        </ul>
      </GlassCard>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => { setJoined(true); toast.success("Joined voice room"); }}
          disabled={mic !== "ok" || joined}
          className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> {joined ? "Joined" : "Join voice room"}
        </button>
        <button
          onClick={() => navigate({ to: "/interview", search: { type } })}
          disabled={!joined}
          className="gradient-bg inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white glow disabled:opacity-50"
        >
          <PlayCircle className="h-4 w-4" /> Start interview
        </button>
      </div>
    </div>
  );
}

function Check({ label, icon: Icon, status, action, actionLabel }: any) {
  const ok = status === "ok";
  const fail = status === "fail";
  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div className="flex-1">
          <div className="text-sm font-medium">{label}</div>
          <div className={`text-xs ${ok ? "text-emerald-400" : fail ? "text-rose-400" : "text-muted-foreground"}`}>
            {ok ? "Ready" : fail ? "Failed" : "Not checked"}
          </div>
        </div>
        {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : fail ? <AlertCircle className="h-5 w-5 text-rose-400" /> : null}
      </div>
      {action && (
        <button onClick={action} className="glass mt-3 w-full rounded-lg px-3 py-2 text-xs hover:bg-white/10">
          {actionLabel}
        </button>
      )}
    </GlassCard>
  );
}