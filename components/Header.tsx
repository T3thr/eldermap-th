"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Home, Info, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import About from "./About";
import { useTheme } from "next-themes"; // Import useTheme for theme management

// Simple Thailand Flag SVG (non-animated)
function ThaiFlagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="0"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0" y="0" width="24" height="4" fill="#A51931" />
      <rect x="0" y="4" width="24" height="4" fill="#FFFFFF" />
      <rect x="0" y="8" width="24" height="8" fill="#2D2A4A" />
      <rect x="0" y="16" width="24" height="4" fill="#FFFFFF" />
      <rect x="0" y="20" width="24" height="4" fill="#A51931" />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const { theme, setTheme } = useTheme(); // Add theme management

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const NAV_ITEMS = [
    { name: "Home", href: "/", icon: <Home size={24} />, action: null },
    { name: "About", href: "#", icon: <Info size={24} />, action: () => setAboutOpen(true) },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-glass-border">
        <motion.div
          className="container mx-auto px-4 py-3 flex items-center justify-between"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold text-primary flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <motion.span
              className="hidden sm:block"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              Thai Provinces
            </motion.span>
            <motion.div whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 300 }}>
              <ThaiFlagIcon />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex mr-24 items-center space-x-6">
            {NAV_ITEMS.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (item.action) {
                      e.preventDefault();
                      item.action();
                    }
                  }}
                  className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors relative group"
                >
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className="text-primary transition-colors duration-300"
                  >
                    {item.icon}
                  </motion.div>
                  <span>{item.name}</span>
                  <motion.div
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full group-hover:w-full transition-all duration-300"
                    whileHover={{ width: "100%" }}
                  />
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Theme Toggle & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {mounted && (
              <ThemeToggle
                className="hover:bg-accent/20 transition-all p-2"
                animationsEnabled={animationsEnabled}
              />
            )}
            <motion.button
              onClick={toggleMenu}
              className="md:hidden text-foreground hover:text-primary transition-all p-2 rounded-full hover:bg-accent/10"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--accent), 0.2)" }}
              aria-label="Toggle Menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={menuOpen ? "close" : "menu"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {menuOpen ? <X size={24} /> : <Menu size={24} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      </header>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 z-40 backdrop-blur-md"
              onClick={closeMenu}
            />

            {/* Sidebar */}
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg z-50 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-auto border-t border-primary/20"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 flex justify-center pt-1">
                <motion.div
                  className="w-12 h-1 bg-primary/30 rounded-full"
                  initial={{ width: "20%" }}
                  animate={{ width: "10%" }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                />
              </div>

              <div className="p-6 space-y-6 mt-2">
                <div className="flex justify-between items-center">
                  <motion.h2
                    className="text-xl font-bold text-primary"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Menu
                  </motion.h2>
                  <motion.button
                    onClick={closeMenu}
                    className="text-foreground hover:text-primary bg-accent/10 p-2 rounded-full"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--accent), 0.2)" }}
                    aria-label="close"
                  >

                  </motion.button>
                </div>

                <nav className="space-y-2">
                  {NAV_ITEMS.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      onHoverStart={() => setActiveIndex(index)}
                      onHoverEnd={() => setActiveIndex(null)}
                      className="relative"
                    >
                      <Link
                        href={item.href}
                        onClick={(e) => {
                          if (item.action) {
                            e.preventDefault();
                            item.action();
                          }
                          closeMenu();
                        }}
                        className="flex items-center justify-between text-foreground hover:text-primary transition-colors py-4 px-4 rounded-xl hover:bg-accent/10 w-full group"
                      >
                        <div className="flex items-center space-x-3">
                          <motion.div
                            whileHover={{ rotate: 15, scale: 1.2 }}
                            animate={{
                              scale: activeIndex === index ? [1, 1.2, 1] : 1,
                              rotate: activeIndex === index ? [0, 10, 0] : 0,
                            }}
                            transition={{
                              duration: 0.5,
                              repeat: activeIndex === index ? Infinity : 0,
                              repeatDelay: 1,
                            }}
                            className="text-primary p-2 bg-primary/10 rounded-lg"
                          >
                            {item.icon}
                          </motion.div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <motion.div
                          animate={{ x: activeIndex === index ? [0, 5, 0] : 0 }}
                          transition={{
                            duration: 0.5,
                            repeat: activeIndex === index ? Infinity : 0,
                            repeatDelay: 1,
                          }}
                        >
                          <ChevronRight
                            size={18}
                            className="text-primary/70 group-hover:text-primary transition-colors"
                          />
                        </motion.div>
                      </Link>
                      <AnimatePresence>
                        {activeIndex === index && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute inset-0 bg-primary/5 rounded-xl -z-10"
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </nav>

                {/* Theme Section in Mobile Menu */}
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div
                    className="w-full p-4 bg-accent/5 rounded-xl border border-primary/10"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className="space-y-4">
                      <p className="text-sm text-foreground/70">Theme</p>
                      <select
                        className="w-full p-2 bg-background rounded-lg border border-primary/20 text-foreground"
                        onChange={(e) => {
                          const newTheme = e.target.value;
                          setTheme(newTheme); // Use setTheme from next-themes
                          closeMenu();
                        }}
                        value={theme || "light"} // Bind to current theme
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-foreground/70">Animations</p>
                        <motion.button
                          onClick={() => setAnimationsEnabled(!animationsEnabled)}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            animationsEnabled ? "bg-primary text-white" : "bg-accent/20 text-foreground"
                          }`}
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          {animationsEnabled ? "On" : "Off"}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
      </AnimatePresence>
    </>
  );
}