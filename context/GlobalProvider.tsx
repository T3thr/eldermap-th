"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeProvider";
import FloatingSidebar from "@/components/FloatingSidebar";
import NewsBanner from "@/components/NewsBanner"; 
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // Import usePathname to get the current URL

export default function GlobalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname(); // Get the current pathname

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <FloatingSidebar />
          {/* Conditionally render the NewsBanner only on the homepage */}
          {pathname === "/" && <NewsBanner />}
          {children}
      </ThemeProvider>
    </SessionProvider>
  );
}