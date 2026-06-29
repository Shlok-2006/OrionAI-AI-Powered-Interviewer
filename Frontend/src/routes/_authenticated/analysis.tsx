import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckSquare, Square, TrendingUp, Sparkles, AlertTriangle, Lightbulb, Calendar } from "lucide-react";
import api from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import LoadingSpinner from "@/components/LoadingSpinner";

export const Route = createFileRoute("/_authenticated/analysis")({
  head: () => ({ meta: [{ title: "Analysis Dashboard — OrionAI" }] }),
  component: AnalysisPage,
});

type Feedback = {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  confidenceScore: number;
  leadershipScore: number;
  problemSolvingScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  overallSummary: string;
};

type Interview = {
  id: string;
  type: string;
  rawType: string;
  createdAt: string;
  feedback: Feedback;
};

const DIMENSIONS = [
  { key: "communicationScore", label: "Communication" },
  { key: "technicalScore", label: "Technical" },
  { key: "confidenceScore", label: "Confidence" },
  { key: "leadershipScore", label: "Leadership" },
  { key: "problemSolvingScore", label: "Problem Solving" },
];

const COLORS = [
  { 
    name: "Cyan", 
    raw: "oklch(0.65 0.20 220)", 
    start: "oklch(0.70 0.18 200)", 
    end: "oklch(0.55 0.22 240)", 
    fill: "from-cyan-400 to-blue-500", 
    text: "text-cyan-400" 
  },
  { 
    name: "Purple", 
    raw: "oklch(0.65 0.22 290)", 
    start: "oklch(0.70 0.20 290)", 
    end: "oklch(0.60 0.25 330)", 
    fill: "from-purple-400 to-pink-500", 
    text: "text-purple-400" 
  },
  { 
    name: "Rose", 
    raw: "oklch(0.65 0.25 20)", 
    start: "oklch(0.70 0.22 15)", 
    end: "oklch(0.55 0.22 40)", 
    fill: "from-rose-400 to-orange-500", 
    text: "text-rose-400" 
  },
  { 
    name: "Emerald", 
    raw: "oklch(0.65 0.20 150)", 
    start: "oklch(0.70 0.18 140)", 
    end: "oklch(0.55 0.20 170)", 
    fill: "from-emerald-400 to-teal-500", 
    text: "text-emerald-400" 
  },
];

function AnalysisPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    score: number;
    dimension: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/interview/history");
        if (alive) {
          const rawInterviews = Array.isArray(data) ? data : [];
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

          const mapped: Interview[] = sortedChronological.map((iv: any) => {
            const rawType = iv.type;
            typeCounts[rawType] = (typeCounts[rawType] || 0) + 1;
            const countStr = String(typeCounts[rawType]).padStart(2, "0");
            
            // Map backend feedback fields to our local frontend type
            const fb = iv.feedback || {};
            const mappedFeedback: Feedback = {
              overallScore: fb.overallScore ?? 0,
              communicationScore: fb.communicationScore ?? fb.communication ?? 0,
              technicalScore: fb.technicalScore ?? fb.technical ?? 0,
              confidenceScore: fb.confidenceScore ?? fb.confidence ?? 0,
              leadershipScore: fb.leadershipScore ?? fb.leadership ?? 0,
              problemSolvingScore: fb.problemSolvingScore ?? fb.problemSolving ?? 0,
              strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
              weaknesses: Array.isArray(fb.weaknesses) ? fb.weaknesses : [],
              suggestions: Array.isArray(fb.suggestions) ? fb.suggestions : [],
              overallSummary: fb.overallSummary ?? "",
            };

            return {
              id: iv.id,
              rawType: rawType,
              type: `${formatType(rawType)} - ${countStr}`,
              createdAt: iv.createdAt,
              feedback: mappedFeedback,
            };
          });

          // Sort back to newest first
          const newestFirst = mapped.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setInterviews(newestFirst);
          
          // Auto-select top 2 by default if available
          if (newestFirst.length >= 2) {
            setSelectedIds([newestFirst[0].id, newestFirst[1].id]);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
        ? [...prev, id]
        : prev
    );
  };

  const selectedInterviews = useMemo(() => {
    return interviews.filter((x) => selectedIds.includes(x.id)).reverse(); // Reverse so they are chronological in charts
  }, [interviews, selectedIds]);

  const hasEnoughSelection = selectedIds.length >= 2;

  if (loading) return <LoadingSpinner label="Loading analysis..." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance Analysis</h1>
          <p className="text-muted-foreground">Select 2 to 4 interviews to compare your scores, strengths, and weaknesses.</p>
        </div>
      </div>

      {interviews.length === 0 ? (
        <GlassCard className="mt-8 text-center text-muted-foreground">
          You haven't completed any interviews yet. Complete at least 2 interviews to see analysis.
          <div className="mt-4">
            <Link to="/interview-types" className="gradient-bg inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white glow">
              Start an interview
            </Link>
          </div>
        </GlassCard>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left Panel: Selection List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" /> Select Interviews ({selectedIds.length}/4)
            </h2>
            <div className="grid gap-3 max-h-[600px] overflow-y-auto p-1 pb-6">
              {interviews.map((iv) => {
                const isSelected = selectedIds.includes(iv.id);
                const selectIndex = selectedIds.indexOf(iv.id);
                const badgeColor = isSelected ? COLORS[selectIndex % COLORS.length].fill : "";

                return (
                  <div
                    key={iv.id}
                    onClick={() => toggleSelect(iv.id)}
                    className={`glass p-4 flex items-center justify-between cursor-pointer transition-all border ${
                      isSelected ? "border-primary/40 bg-primary/5 scale-[1.01]" : "hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md gradient-bg ${badgeColor}`}>
                          <CheckSquare className="h-3.5 w-3.5 text-white" />
                        </div>
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-semibold text-sm">{iv.type}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(iv.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold gradient-text">{iv.feedback.overallScore}%</div>
                      {isSelected && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md text-white gradient-bg ${badgeColor}`}>
                          P{selectIndex + 1}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Comparison Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {!hasEnoughSelection ? (
              <GlassCard className="h-full flex flex-col items-center justify-center text-center p-12 min-h-[300px]">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium">Select more interviews</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Please select at least 2 interviews from the left list to generate a comparison chart and detailed report analysis.
                </p>
              </GlassCard>
            ) : (
              <>
                {/* 1. Skill Dimension Line Chart */}
                <GlassCard strong className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" /> Skill Performance Progress Tracker
                    </h3>
                    <div className="flex gap-3 text-xs">
                      {selectedInterviews.map((iv) => (
                        <div key={iv.id} className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${COLORS[selectedIds.indexOf(iv.id) % COLORS.length].fill}`} />
                          <span className="font-medium text-muted-foreground">{iv.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom SVG Line Chart */}
                  <div className="w-full overflow-x-auto relative">
                    <svg viewBox="0 0 600 300" className="w-full min-w-[500px] h-[300px] overflow-visible">
                      <defs>
                        {selectedInterviews.map((iv, idx) => {
                          const colorIdx = selectedIds.indexOf(iv.id) % COLORS.length;
                          const c = COLORS[colorIdx];
                          return (
                            <g key={iv.id}>
                              {/* Area Fill Gradient */}
                              <linearGradient id={`lineGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={c.start} stopOpacity="0.25" />
                                <stop offset="100%" stopColor={c.end} stopOpacity="0.0" />
                              </linearGradient>
                              {/* Line Stroke Gradient (Horizontal) */}
                              <linearGradient id={`strokeGrad-${idx}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={c.start} />
                                <stop offset="100%" stopColor={c.end} />
                              </linearGradient>
                            </g>
                          );
                        })}
                      </defs>

                      {/* Grid Lines */}
                      {[0, 25, 50, 75, 100].map((val) => {
                        const y = 250 - (val / 100) * 200;
                        return (
                          <g key={val} className="opacity-20 dark:opacity-10">
                            <line x1="50" y1={y} x2="570" y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                            <text x="40" y={y + 4} textAnchor="end" className="text-[10px] fill-foreground/60 font-medium">{val}%</text>
                          </g>
                        );
                      })}

                      {/* X Axis Labels */}
                      {DIMENSIONS.map((dim, dimIdx) => {
                        const x = 80 + dimIdx * 100;
                        return (
                          <text key={dim.key} x={x} y="270" textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
                            {dim.label}
                          </text>
                        );
                      })}

                      {/* Render Lines & Areas for each Selected Session */}
                      {selectedInterviews.map((iv, idx) => {
                        const colorIdx = selectedIds.indexOf(iv.id) % COLORS.length;
                        const color = COLORS[colorIdx].raw;
                        
                        // Calculate coordinates for the 5 dimensions
                        const points = DIMENSIONS.map((dim, dimIdx) => {
                          const score = (iv.feedback as any)[dim.key] ?? 0;
                          return {
                            x: 80 + dimIdx * 100,
                            y: 250 - (score / 100) * 200,
                            score,
                            dimension: dim.label,
                            title: iv.type,
                          };
                        });

                        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                        const areaPath = `${linePath} L ${points[points.length - 1].x} 250 L ${points[0].x} 250 Z`;

                        return (
                          <g key={iv.id}>
                            {/* Area Gradient */}
                            <path d={areaPath} fill={`url(#lineGrad-${idx})`} className="transition-all duration-500" />

                            {/* The Line */}
                            <path
                              d={linePath}
                              fill="none"
                              stroke={`url(#strokeGrad-${idx})`}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="transition-all duration-500"
                            />

                            {/* Glowing Dots */}
                            {points.map((p, pIdx) => (
                              <g key={pIdx} className="group/dot">
                                {/* Outer Pulse circle */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="8"
                                  fill={COLORS[colorIdx].start}
                                  className="opacity-20 transition-opacity duration-200 group-hover/dot:opacity-50"
                                />
                                {/* Inner solid circle */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4.5"
                                  fill={COLORS[colorIdx].start}
                                  stroke="var(--background)"
                                  strokeWidth="1.5"
                                />
                                {/* Large Invisible Hover Target */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="16"
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => {
                                    setActiveTooltip({
                                      x: p.x,
                                      y: p.y,
                                      title: p.title,
                                      score: p.score,
                                      dimension: p.dimension,
                                    });
                                  }}
                                  onMouseLeave={() => setActiveTooltip(null)}
                                />
                              </g>
                            ))}
                          </g>
                        );
                      })}

                      {/* X Axis Line */}
                      <line x1="50" y1="250" x2="570" y2="250" stroke="currentColor" strokeWidth="1" className="opacity-20" />

                      {/* Interactive Tooltip Speech Bubble */}
                      {activeTooltip && (
                        <g className="pointer-events-none transition-all duration-150">
                          {/* Shadow / Background Glow */}
                          <rect
                            x={activeTooltip.x - 70}
                            y={activeTooltip.y - 62}
                            width="140"
                            height="48"
                            rx="10"
                            fill="var(--background)"
                            stroke="var(--primary)"
                            strokeWidth="1.5"
                            style={{ filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.15))" }}
                          />
                          {/* Triangle pointer */}
                          <polygon
                            points={`${activeTooltip.x - 6},${activeTooltip.y - 15} ${activeTooltip.x + 6},${activeTooltip.y - 15} ${activeTooltip.x},${activeTooltip.y - 9}`}
                            fill="var(--background)"
                            stroke="var(--primary)"
                            strokeWidth="1.5"
                          />
                          {/* Cover up rect to hide triangle top stroke */}
                          <rect
                            x={activeTooltip.x - 8}
                            y={activeTooltip.y - 16}
                            width="16"
                            height="2"
                            fill="var(--background)"
                          />
                          {/* Title text */}
                          <text
                            x={activeTooltip.x}
                            y={activeTooltip.y - 44}
                            textAnchor="middle"
                            className="text-[10px] font-bold fill-foreground"
                          >
                            {activeTooltip.title}
                          </text>
                          {/* Score text */}
                          <text
                            x={activeTooltip.x}
                            y={activeTooltip.y - 28}
                            textAnchor="middle"
                            className="text-[9px] fill-muted-foreground font-semibold"
                          >
                            {activeTooltip.dimension}: <tspan className="fill-primary font-bold">{activeTooltip.score}%</tspan>
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>
                </GlassCard>

                {/* 2. Side-by-Side Comparison of Strengths / Weaknesses */}
                <div className="grid gap-6">
                  {/* Strengths */}
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-4 text-emerald-500 dark:text-emerald-400">
                      <Sparkles className="h-5 w-5" /> Strengths Comparison
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" style={{ gridTemplateColumns: `repeat(${selectedInterviews.length}, minmax(0, 1fr))` }}>
                      {selectedInterviews.map((iv) => {
                        const colorIdx = selectedIds.indexOf(iv.id) % COLORS.length;
                        return (
                          <div key={iv.id} className="space-y-2 border-r border-white/5 last:border-0 pr-3">
                            <div className={`text-xs font-bold ${COLORS[colorIdx].text} uppercase tracking-wider`}>{iv.type}</div>
                            <ul className="space-y-1.5 text-xs text-muted-foreground">
                              {iv.feedback.strengths.slice(0, 4).map((str, sIdx) => (
                                <li key={sIdx} className="leading-relaxed">• {str}</li>
                              ))}
                              {iv.feedback.strengths.length === 0 && <li className="italic">No strengths recorded.</li>}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>

                  {/* Weaknesses */}
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-4 text-rose-500 dark:text-rose-400">
                      <AlertTriangle className="h-5 w-5" /> Areas for Improvement
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" style={{ gridTemplateColumns: `repeat(${selectedInterviews.length}, minmax(0, 1fr))` }}>
                      {selectedInterviews.map((iv) => {
                        const colorIdx = selectedIds.indexOf(iv.id) % COLORS.length;
                        return (
                          <div key={iv.id} className="space-y-2 border-r border-white/5 last:border-0 pr-3">
                            <div className={`text-xs font-bold ${COLORS[colorIdx].text} uppercase tracking-wider`}>{iv.type}</div>
                            <ul className="space-y-1.5 text-xs text-muted-foreground">
                              {iv.feedback.weaknesses.slice(0, 4).map((weak, wIdx) => (
                                <li key={wIdx} className="leading-relaxed">• {weak}</li>
                              ))}
                              {iv.feedback.weaknesses.length === 0 && <li className="italic">No major weaknesses.</li>}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>

                  {/* Suggestions */}
                  <GlassCard className="p-6">
                    <h3 className="font-semibold text-base flex items-center gap-2 mb-4 text-amber-500 dark:text-amber-400">
                      <Lightbulb className="h-5 w-5" /> Actionable Advice
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" style={{ gridTemplateColumns: `repeat(${selectedInterviews.length}, minmax(0, 1fr))` }}>
                      {selectedInterviews.map((iv) => {
                        const colorIdx = selectedIds.indexOf(iv.id) % COLORS.length;
                        return (
                          <div key={iv.id} className="space-y-2 border-r border-white/5 last:border-0 pr-3">
                            <div className={`text-xs font-bold ${COLORS[colorIdx].text} uppercase tracking-wider`}>{iv.type}</div>
                            <ul className="space-y-1.5 text-xs text-muted-foreground">
                              {iv.feedback.suggestions.slice(0, 4).map((sug, sIdx) => (
                                <li key={sIdx} className="leading-relaxed">• {sug}</li>
                              ))}
                              {iv.feedback.suggestions.length === 0 && <li className="italic">No suggestions.</li>}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisPage;
