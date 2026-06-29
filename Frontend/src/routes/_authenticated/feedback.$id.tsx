import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, ArrowLeft, Sparkles, TriangleAlert, Lightbulb } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import CircularScore from "@/components/CircularScore";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feedback/$id")({
  head: () => ({ meta: [{ title: "Feedback Report — OrionAI" }] }),
  component: FeedbackPage,
});

type Report = {
  overall: number;
  type: string;
  scores: { communication: number; technical: number; confidence: number; leadership: number; problemSolving: number };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallSummary: string;
  transcript: { role: "ai" | "user"; text: string }[];
};

const DEMO: Report = {
  overall: 82, type: "Behavioral",
  scores: { communication: 88, technical: 76, confidence: 81, leadership: 79, problemSolving: 85 },
  strengths: ["Clear and structured answers", "Strong examples from past projects", "Good pacing and tone"],
  weaknesses: ["Occasionally used filler words", "Could quantify impact more"],
  suggestions: ["Practice STAR format with metrics", "Pause briefly instead of using filler words", "Lead with the outcome, then explain"],
  overallSummary: "You demonstrated good communication and structured your answers well, but could improve by quantifying your impact.",
  transcript: [
    { role: "ai", text: "Tell me about a time you led a team through a difficult project." },
    { role: "user", text: "Sure — at my last company we had a tight deadline and I…" },
  ],
};

function FeedbackPage() {
  const { id } = useParams({ from: "/_authenticated/feedback/$id" });
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get(`/interview/report/${id}`);
        if (alive) setData(data);
      } catch {
        if (alive) setData(DEMO);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const download = async () => {
    try {
      const res = await api.get(`/interview/report/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `interview-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download not available yet");
    }
  };

  if (loading) return <LoadingSpinner label="Generating report…" />;
  if (!data) return null;

  const skillRows: [string, number][] = [
    ["Communication", data.scores.communication],
    ["Technical", data.scores.technical],
    ["Confidence", data.scores.confidence],
    ["Leadership", data.scores.leadership],
    ["Problem solving", data.scores.problemSolving],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Link>
      </div>

      <GlassCard strong className="flex flex-col items-center gap-8 p-10 md:flex-row md:items-start">
        <CircularScore value={data.overall} />
        <div className="flex-1">
          <div className="text-sm uppercase tracking-widest text-muted-foreground">{data.type} interview</div>
          <h1 className="mt-1 text-3xl font-bold">Your feedback report</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{data.overallSummary}</p>

          <div className="mt-6 space-y-3">
            {skillRows.map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-muted-foreground">{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
                  <div className="gradient-bg h-full rounded-full" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <Section icon={Sparkles} title="Strengths" items={data.strengths} accent="oklch(0.75 0.18 160)" />
        <Section icon={TriangleAlert} title="Weaknesses" items={data.weaknesses} accent="oklch(0.7 0.2 30)" />
        <Section icon={Lightbulb} title="Suggestions" items={data.suggestions} accent="oklch(0.75 0.18 80)" />
      </div>

      <GlassCard className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Transcript</h2>
        <div className="space-y-3 text-sm">
          {data.transcript.map((t, i) => (
            <div key={i} className="flex gap-3">
              <span className={`min-w-12 text-xs uppercase tracking-widest ${t.role === "ai" ? "gradient-text" : "text-muted-foreground"}`}>
                {t.role === "ai" ? "AI" : "You"}
              </span>
              <p className="flex-1">{t.text}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Section({ icon: Icon, title, items, accent }: { icon: any; title: string; items: string[]; accent: string }) {
  return (
    <GlassCard>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5" style={{ color: accent }} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((s, i) => <li key={i}>• {s}</li>)}
      </ul>
    </GlassCard>
  );
}