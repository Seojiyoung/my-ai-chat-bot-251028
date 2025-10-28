"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedMessageProps {
  children: ReactNode;
  delay?: number;
}

export function AnimatedMessage({
  children,
  delay = 0,
}: AnimatedMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}

