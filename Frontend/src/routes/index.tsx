import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bot, Sparkles, Mic, BarChart3, ShieldCheck, Zap, ArrowRight, PlayCircle,
  Brain, Code2, Users, Building2,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import GlassCard from "@/components/GlassCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrionAI — AI-Powered Interviewer" },
      { name: "description", content: "Voice-based AI mock interviews for behavioral, technical, system design, and HR rounds. Get instant feedback and a detailed report." },
      { property: "og:title", content: "OrionAI — AI-Powered Interviewer" },
      { property: "og:description", content: "Voice-based AI mock interviews. Instant feedback. Detailed reports." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-24 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl"
            >
              Ace your next interview with your <span className="gradient-text">AI coach</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-5 max-w-xl text-lg text-muted-foreground"
            >
              Realistic voice-based mock interviews for behavioral, technical, system
              design and HR rounds — with instant, recruiter-grade feedback.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/signup" className="gradient-bg inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium text-white glow">
                Start interview <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="glass inline-flex items-center gap-2 rounded-xl px-5 py-3 font-medium">
                <PlayCircle className="h-4 w-4" /> See how it works
              </a>
            </motion.div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Private & secure</div>
              <div className="flex items-center gap-1.5"><Zap className="h-4 w-4" /> Instant feedback</div>
              <div className="flex items-center gap-1.5"><Mic className="h-4 w-4" /> Voice native</div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="glass-strong relative overflow-hidden p-8 glow">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[oklch(0.55_0.25_300/0.35)] blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[oklch(0.55_0.25_255/0.35)] blur-3xl" />
              <div className="relative">
                <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] border border-white/10 glow">
                  <img src="/bot.png" alt="AI Agent" className="h-full w-full object-cover" />
                </div>
                <div className="mt-6 text-center">
                  <div className="text-sm uppercase tracking-widest text-muted-foreground">Live interview</div>
                  <div className="mt-1 text-xl font-semibold">"Tell me about a time you led a team."</div>
                </div>
                <div className="mt-6 flex items-center justify-center gap-1">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="gradient-bg w-1 rounded-full"
                      animate={{ height: [6, 28 + (i % 4) * 6, 10, 22, 6] }}
                      transition={{ duration: 1.2 + (i % 3) * 0.2, repeat: Infinity, delay: i * 0.05 }}
                      style={{ height: 8 }}
                    />
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="glass rounded-xl p-3"><div className="font-semibold text-[oklch(0.75_0.18_180)]">Listening</div></div>
                  <div className="glass rounded-xl p-3"><div className="font-semibold text-[oklch(0.75_0.2_300)]">Thinking</div></div>
                  <div className="glass rounded-xl p-3"><div className="font-semibold text-[oklch(0.75_0.2_255)]">Speaking</div></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Everything you need to <span className="gradient-text">prepare</span></h2>
          <p className="mt-3 text-muted-foreground">Built with realistic AI conversations and recruiter-grade scoring.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: Brain, title: "4 interview tracks", desc: "Behavioral, Technical, System Design, and HR / Culture Fit." },
            { icon: Mic, title: "Voice-native", desc: "Talk like a real interview — no chat boxes, no typing." },
            { icon: BarChart3, title: "Detailed scoring", desc: "Communication, technical, confidence, leadership & more." },
            { icon: Sparkles, title: "Instant feedback", desc: "Strengths, weaknesses and tailored suggestions in seconds." },
            { icon: ShieldCheck, title: "Private by default", desc: "Your transcripts are yours — never shared, ever." },
            { icon: Zap, title: "Retake anytime", desc: "Iterate fast and watch your scores climb." },
          ].map(({ icon: Icon, title, desc }) => (
            <GlassCard key={title}>
              <Icon className="h-7 w-7 text-[oklch(0.7_0.2_280)]" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto mt-24 max-w-7xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[
            { icon: Users, title: "Create profile", desc: "Add your target role and experience." },
            { icon: Building2, title: "Pick a track", desc: "Behavioral, technical, system design or HR." },
            { icon: Mic, title: "Talk to AI", desc: "Voice-only interview, just like the real thing." },
            { icon: Code2, title: "Get your report", desc: "Scores, strengths, and what to improve." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <GlassCard key={title} className="relative">
              <div className="gradient-text absolute right-4 top-3 text-3xl font-bold opacity-30">0{i + 1}</div>
              <Icon className="h-6 w-6 text-[oklch(0.75_0.2_255)]" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

    </PageShell>
  );
}
