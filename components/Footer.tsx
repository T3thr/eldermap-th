"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import About from "./About"; // Import the About component

export default function Footer() {
  const [aboutOpen, setAboutOpen] = useState(false); // State to control About modal

  return (
    <>
      <footer className="bg-card border-t border-border text-foreground py-10">
        <div className="container mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 justify-between gap-8">
            {/* About Section 
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">About CityHistory</h3>
              <p className="text-foreground/70">
                Explore the rich history of your city through interactive maps and timelines.
              </p>
            </div>
*/}
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {[
                  { name: "Home", href: "/" },
                  { name: "About", href: "#", action: () => setAboutOpen(true) },
                  { name: "for Admin", href: "/login" }
                ].map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        if (item.action) {
                          e.preventDefault();
                          item.action();
                        }
                      }}
                      className="text-foreground/70 hover:text-accent transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social Media Links */}
            <div>
              <h3 className="text-lg font-bold text-primary mb-4">Follow Me</h3>
              <div className="flex space-x-4">
                {[
                  { name: "X (Twitter)", url: "https://twitter.com" },
                  { name: "Facebook", url: "https://www.facebook.com/t3rapat/" },
                  { name: "Instagram", url: "https://www.instagram.com/3._rapat/" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground/70 hover:text-accent transition-colors"
                  >
                    {social.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright Notice */}
          <div className="border-t border-border mt-8 pt-6 text-center text-foreground/70 text-sm">
            &copy; {new Date().getFullYear()} ElderMap. All rights reserved.
          </div>
        </div>
      </footer>

      {/* About Modal */}
      <AnimatePresence>
        {aboutOpen && <About onClose={() => setAboutOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
