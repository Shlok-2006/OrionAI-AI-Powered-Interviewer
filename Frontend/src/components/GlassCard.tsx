import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = HTMLMotionProps<"div"> & {
  children: ReactNode;
  strong?: boolean;
};

export function GlassCard({ children, strong, className, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(strong ? "glass-strong" : "glass", "p-6", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default GlassCard;