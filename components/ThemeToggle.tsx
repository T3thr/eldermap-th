"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { debounce } from "lodash";

interface ThemeToggleProps {
  className?: string;
  closeMenuOnToggle?: () => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animationsEnabled?: boolean;
}

export default function ThemeToggle({
  className = "",
  closeMenuOnToggle,
  size = "md",
  showLabel = false,
  animationsEnabled = true,
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getSizing = () => {
    switch (size) {
      case "sm":
        return { width: "w-12", height: "h-6", circle: "w-4 h-4", icon: 14 };
      case "lg":
        return { width: "w-20", height: "h-10", circle: "w-8 h-8", icon: 20 };
      default:
        return { width: "w-16", height: "h-8", circle: "w-6 h-6", icon: 16 };
    }
  };

  const { width, height, circle, icon } = getSizing();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, [mounted, setTheme]);

  const syncTheme = useCallback(
    debounce((newTheme: string) => {
      localStorage.setItem("theme", newTheme);
    }, 100),
    []
  );

  useEffect(() => {
    if (mounted && theme) {
      syncTheme(theme);
    }
  }, [theme, mounted, syncTheme]);

  const toggleTheme = useCallback(
    debounce(() => {
      const newTheme = theme === "dark" ? "light" : "dark";
      setTheme(newTheme);
      if (closeMenuOnToggle) {
        closeMenuOnToggle();
      }
    }, 200),
    [theme, setTheme, closeMenuOnToggle]
  );

  if (!mounted) {
    return <div className={`${width} ${height} rounded-full bg-gray-200 dark:bg-gray-700 ${className}`} />;
  }

  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm font-medium text-foreground transition-colors duration-300">
          {isDark ? "Dark" : "Light"}
        </span>
      )}

      <motion.div
        className={`relative ${width} ${height} rounded-full cursor-pointer ${className}`}
        onClick={toggleTheme}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={animationsEnabled ? { scale: 1.0 } : {}}
        whileTap={animationsEnabled ? { scale: 0.95 } : {}}
      >
        <motion.div
          className="absolute inset-0 rounded-full transition-colors duration-300"
          animate={
            animationsEnabled
              ? { backgroundColor: isDark ? "rgba(30, 58, 138, 0.6)" : "rgba(250, 204, 21, 0.5)" }
              : { backgroundColor: isDark ? "#1e40af" : "#fbbf24" }
          }
        />

        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className={`
              absolute inset-0 
              bg-gradient-to-r 
              ${isDark ? "from-blue-800/30 to-indigo-900/30" : "from-yellow-400/30 to-orange-400/30"}
              transition-all duration-300
            `}
          />
          <AnimatePresence>
            {isHovered && animationsEnabled &&
              [...Array(6)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className={`absolute rounded-full ${isDark ? "bg-blue-200" : "bg-yellow-200"}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    width: isDark ? "1px" : "2px",
                    height: isDark ? "1px" : "2px",
                    x: 4 + Math.random() * (parseInt(width.replace("w-", "")) - 8),
                    y: 2 + Math.random() * (parseInt(height.replace("h-", "")) - 4),
                  }}
                  transition={{
                    duration: 1.5 + Math.random(),
                    repeat: Infinity,
                    repeatDelay: Math.random() * 2,
                  }}
                />
              ))}
          </AnimatePresence>
        </div>

        <motion.div
          className={`
            absolute top-1 
            ${circle} 
            rounded-full 
            shadow-md
            flex items-center justify-center
            z-10
            overflow-hidden
            transition-colors duration-300
          `}
          animate={{
            backgroundColor: isDark ? "#1e293b" : "#ffffff",
            left: isDark ? `calc(100% - ${parseInt(circle.replace("w-", "")) + 21}px)` : "4px",
          }}
          transition={animationsEnabled ? { type: "spring", stiffness: 500, damping: 30 } : { duration: 0 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDark ? "dark" : "light"}
              initial={animationsEnabled ? { scale: 0, rotate: -30, opacity: 0 } : { opacity: 1 }}
              animate={animationsEnabled ? { scale: 1, rotate: 0, opacity: 1 } : { opacity: 1 }}
              exit={animationsEnabled ? { scale: 0, rotate: 30, opacity: 0 } : { opacity: 0 }}
              transition={animationsEnabled ? { duration: 0.2 } : { duration: 0 }}
              className="relative"
            >
              {isDark ? (
                <Moon className="text-blue-400" size={icon} />
              ) : (
                <Sun className="text-yellow-400" size={icon} />
              )}

              {!isDark && animationsEnabled && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`sunray-${i}`}
                      className="absolute bg-yellow-300 origin-center"
                      style={{
                        width: "1px",
                        height: `${icon * 0.4}px`,
                        left: "50%",
                        top: "50%",
                        transformOrigin: "0 0",
                        transform: `rotate(${i * 45}deg) translateY(-${icon * 0.9}px)`,
                      }}
                      animate={{
                        opacity: [0.4, 1, 0.4],
                        height: [`${icon * 0.4}px`, `${icon * 0.6}px`, `${icon * 0.4}px`],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {isDark && isHovered && animationsEnabled &&
            [...Array(5)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 3,
                  delay: i * 0.3,
                }}
                style={{
                  left: `${15 + Math.random() * 20}%`,
                  top: `${10 + Math.random() * 80}%`,
                }}
              >
                <div className="relative w-1 h-1 bg-blue-200 rounded-full" />
                {Math.random() > 0.5 && (
                  <>
                    <div className="absolute w-2 h-px bg-blue-200/50 rounded-full" style={{ left: -0.5, top: 0.5 }} />
                    <div className="absolute w-px h-2 bg-blue-200/50 rounded-full" style={{ left: 0.5, top: -0.5 }} />
                  </>
                )}
              </motion.div>
            ))}
        </AnimatePresence>

        <AnimatePresence>
          {!isDark && animationsEnabled && (
            <motion.div
              className="absolute rounded-full bg-gradient-radial from-yellow-200/80 via-yellow-400/10 to-transparent"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: `${parseInt(circle.replace("w-", "")) * 3}px`,
                height: `${parseInt(circle.replace("h-", "")) * 3}px`,
                left: `4px`,
                top: `1px`,
                transform: "translate(-33%, -33%)",
                zIndex: 5,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}