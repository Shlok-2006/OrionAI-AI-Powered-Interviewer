import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Code2, Network, HeartHandshake, HelpCircle, ArrowRight } from "lucide-react";
import GlassCard from "@/components/GlassCard";

export const Route = createFileRoute("/_authenticated/interview-types")({
  head: () => ({ meta: [{ title: "Choose Interview Type — OrionAI" }] }),
  component: InterviewTypesPage,
});

const TYPES = [
  { id: "behavioral", title: "Behavioral", icon: MessageSquare, color: "oklch(0.7 0.2 255)", desc: "STAR-style storytelling, leadership, ownership, communication.", questions: "5 Questions" },
  { id: "technical", title: "Technical", icon: Code2, color: "oklch(0.7 0.2 300)", desc: "Coding concepts, debugging, language fundamentals & trade-offs.", questions: "5 Questions" },
  { id: "system-design", title: "System Design", icon: Network, color: "oklch(0.75 0.18 180)", desc: "Scale, reliability, trade-offs — whiteboard style discussion.", questions: "5 Questions" },
  { id: "hr", title: "HR / Culture Fit", icon: HeartHandshake, color: "oklch(0.75 0.18 80)", desc: "Motivation, values, culture, salary expectations, soft skills.", questions: "5 Questions" },
];

function InterviewTypesPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Choose your <span className="gradient-text">interview track</span></h1>
        <p className="mt-2 text-muted-foreground">Each session is tailored to your target role and experience.</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {TYPES.map(({ id, title, icon: Icon, desc }) => (
          <GlassCard 
            key={id} 
            className="group relative overflow-hidden border border-cyan-500/15 transition-all duration-300 hover:translate-y-[-4px] hover:border-cyan-500/40"
          >
            {/* Ambient Aqua & Blue Glows */}
            <div className="absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-cyan-500/10 blur-[50px] pointer-events-none transition-all duration-500 group-hover:bg-cyan-500/25 group-hover:scale-125" />
            <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-blue-500/5 blur-[50px] pointer-events-none transition-all duration-500 group-hover:bg-blue-500/15" />

            <div className="relative z-10 flex items-start gap-4">
              {/* Icon Container */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] transition-all duration-300 group-hover:scale-105 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_20px_0_rgba(6,182,212,0.25)]">
                <Icon className="h-7 w-7 text-cyan-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-cyan-400">{title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                <button
                  onClick={() => navigate({ to: "/waiting-room", search: { type: id } })}
                  className="gradient-bg mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white glow hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Start <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}