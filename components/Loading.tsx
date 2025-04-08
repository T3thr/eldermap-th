// app/Loading.ts
import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background fixed top-0 left-0 right-0 bottom-0 z-50">
      <motion.div
        className="w-16 h-16 border-4 border-t-transparent border-primary border-r-secondary rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <span className="ml-4 text-lg font-semibold text-foreground animate-pulse">
        Loading...
      </span>
    </div>
  );
};

