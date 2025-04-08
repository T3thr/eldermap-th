"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation"; // Import useRouter
import { FaUser, FaSignOutAlt, FaAngleRight, FaAngleLeft } from "react-icons/fa";

export default function FloatingSidebar() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const router = useRouter(); // Initialize useRouter

  // Only render for authenticated admins or masters
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "master";

  // Handle inactivity fade
  useEffect(() => {
    if (!isAdmin || status === "loading") return;

    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setIsActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsActive(false), 5000); // Fade after 5s
    };

    resetTimer(); // Initial call
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [isAdmin, status]); // Dependencies ensure hook order consistency

  // Don’t render if not an admin, master, or session is loading
  if (status === "loading" || !isAdmin) return null;

  return (
    <div
      className={`fixed top-1/5 -translate-y-1/2 left-0 z-50 transition-all duration-300 ${
        isOpen ? "w-40" : "w-8"
      } bg-card border-r border-accent/20 shadow-lg rounded-r-md ${
        isActive ? "opacity-100" : "opacity-20 hover:opacity-100"
      }`}
      onMouseEnter={() => setIsActive(true)}
    >
      {isOpen ? (
        <div className="flex flex-col h-full">
          {/* Toggle Button */}
          <button
            className="w-full h-10 flex items-center justify-center text-foreground hover:bg-accent/10 transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <FaAngleLeft className="text-lg" />
          </button>
          {/* Profile */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent/10 transition-colors"
            onClick={() => router.push("/admin/dashboard")} // Navigate to /admin/dashboard
          >
            <FaUser className="text-sm" />
            <span className="truncate">{session.user.username}</span>
          </button>
          {/* Sign Out */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/10 transition-colors"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <FaSignOutAlt className="text-sm" />
            Sign Out
          </button>
        </div>
      ) : (
        <button
          className="w-full h-10 flex items-center justify-center text-foreground hover:bg-accent/10 transition-colors"
          onClick={() => setIsOpen(true)}
          aria-label="Open sidebar"
        >
          <FaUser />
          <FaAngleRight className="text-lg" />
        </button>
      )}
    </div>
  );
}
