import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, BarChart3, History as HistoryIcon, Mic, ArrowRight, User as UserIcon, PlayCircle } from "lucide-react";
import api from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — OrionAI" }] }),
  component: DashboardPage,
});

type Stats = { total: number; avg: number; best: number };
type Interview = { id: string; type: string; score: number; createdAt: string };

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, avg: 0, best: 0 });
  const [recent, setRecent] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          api.get("/interview/stats").catch(() => ({ data: { total: 0, avg: 0, best: 0 } })),
          api.get("/interview/history").catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        setStats(s.data);
        
        // Chronological numbering helper
        const rawInterviews = Array.isArray(r.data) ? r.data : [];
        const sortedChronological = [...rawInterviews].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        const typeCounts: Record<string, number> = {};
        const formatType = (type: string) => {
          switch (type) {
            case "TECHNICAL": return "Technical";
            case "BEHAVIORAL": return "Behavioral";
            case "SYSTEM_DESIGN": return "System Design";
            case "HR_CULTURE_FIT": return "HR / Culture Fit";
            default:
              return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          }
        };

        const mapped = sortedChronological.map((iv: any) => {
          const rawType = iv.type;
          typeCounts[rawType] = (typeCounts[rawType] || 0) + 1;
          const countStr = String(typeCounts[rawType]).padStart(2, "0");
          return {
            id: iv.id,
            type: `${formatType(rawType)} - ${countStr}`,
            score: iv.feedback?.overallScore ?? 0,
            createdAt: iv.createdAt,
          };
        });

        // Sort back to newest first and take top 5
        const newestFirst = mapped.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecent(newestFirst.slice(0, 5));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hey there, {user?.fullName || "Candidate"} 👋</h1>
          <p className="text-muted-foreground">Master every interview with AI-powered practice, real-time feedback, and personalized insights.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/interview-types" className="gradient-bg inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white glow">
            <PlayCircle className="h-4 w-4" /> Start interview
          </Link>
          <Link to="/history" className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
            <HistoryIcon className="h-4 w-4" /> View reports
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <StatCard icon={Mic} label="Total interviews" value={stats.total} accent="oklch(0.7 0.2 255)" />
        <StatCard icon={BarChart3} label="Average score" value={`${Math.round(stats.avg)}%`} accent="oklch(0.7 0.2 300)" />
        <StatCard icon={Trophy} label="Best score" value={`${Math.round(stats.best)}%`} accent="oklch(0.75 0.18 80)" />
      </div>

      <div className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Recent interviews</h2>
          <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground">See all →</Link>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : recent.length === 0 ? (
          <GlassCard className="text-center text-muted-foreground">
            No interviews yet. <Link to="/interview-types" className="gradient-text font-semibold">Start your first one →</Link>
          </GlassCard>
        ) : (
          <div className="grid gap-3">
            {recent.map((iv) => (
              <GlassCard key={iv.id} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{iv.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(iv.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="gradient-text text-lg font-bold">{Math.round(iv.score)}%</div>
                  <Link to="/feedback/$id" params={{ id: iv.id }} className="glass inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm">
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-bold">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${accent} 25%, transparent)` }}>
          <Icon className="h-6 w-6" style={{ color: accent }} />
        </div>
      </div>
    </GlassCard>
  );
}