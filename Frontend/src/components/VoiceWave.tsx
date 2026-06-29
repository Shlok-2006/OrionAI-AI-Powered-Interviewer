import { motion } from "framer-motion";

export function VoiceWave({ 
  active = true, 
  bars = 24,
  status = "listening"
}: { 
  active?: boolean; 
  bars?: number;
  status?: "listening" | "thinking" | "speaking" | "connecting"
}) {
  return (
    <div className="flex h-20 items-center justify-center gap-1">
      {Array.from({ length: bars }).map((_, i) => {
        // Determine color based on status
        let colorClass = "gradient-bg";
        if (status === "thinking") {
          colorClass = "bg-[oklch(0.72_0.16_145)] shadow-[0_0_12px_rgba(16,185,129,0.3)]"; // Emerald Green
        } else if (status === "speaking") {
          colorClass = "bg-[oklch(0.65_0.2_260)] shadow-[0_0_12px_rgba(99,102,241,0.3)]"; // Indigo
        }

        // Determine animation properties based on status
        let animateProps = { height: [8, 8] };
        let transitionProps: any = {
          duration: 1.2 + (i % 4) * 0.15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.04,
        };

        if (status === "thinking") {
          // Soft, undulating green wave for thinking
          animateProps = { height: [8, 18 + Math.sin(i * 0.6) * 10, 8] };
          transitionProps.duration = 1.6;
        } else if (status === "speaking") {
          // Bouncing speech wave
          animateProps = { height: [8, 32 + (i % 3) * 12, 8] };
        } else if (active && status === "listening") {
          // Standard active listening wave
          animateProps = { height: [8, 40 + (i % 5) * 6, 12, 32, 8] };
        } else {
          // Idle / Muted
          animateProps = { height: [8, 8] };
        }

        return (
          <motion.span
            key={i}
            className={`${colorClass} w-1.5 rounded-full`}
            animate={animateProps}
            transition={transitionProps}
            style={{ height: 8 }}
          />
        );
      })}
    </div>
  );
}

export default VoiceWave;