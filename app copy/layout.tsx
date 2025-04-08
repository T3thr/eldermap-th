import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import GlobalProvider from "../context/GlobalProvider"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Global metadata base URL for Open Graph, Twitter, etc.
export const metadataBase = new URL("https://eldermap.vercel.app");

// Static Metadata Configuration
export const metadata: Metadata = {
  title: "Thai Provinces Interactive History Platform",
  description: "สำรวจมรดกทางวัฒนธรรมและประวัติศาสตร์อันหลากหลายของจังหวัดในประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบของเรา",
  keywords: "Thai history, interactive map, Phitsanulok, Next.js, Tailwind CSS, provinces, จังหวัด, ประเทศไทย,อำเภอ,โต้ตอบ",
  authors: [{ name: "Theerapat" }],
  // Open Graph (for Facebook and other platforms that support it)
  openGraph: {
    title: "Thai Provinces Interactive History Platform",
    description: "สำรวจมรดกทางวัฒนธรรมและประวัติศาสตร์อันหลากหลายของจังหวัดในประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบของเรา",
    siteName: "ElderMap",
    locale: "th_TH",
    type: "website",
    url: "https://eldermap.vercel.app",
    images: [
      {
        url: "/logo.png", // Link to the favicon file in the public folder
        width: 1200,
        height: 630,
        alt: "Thai Provinces Interactive History Platform",
      },
    ],
  },
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Thai Provinces Interactive History Platform",
    description: "สำรวจมรดกทางวัฒนธรรมและประวัติศาสตร์อันหลากหลายของจังหวัดในประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบของเรา",
    images: ["/logo.png"], // Link to the favicon file in the public folder
  },
  // Facebook (uses Open Graph, but can be explicitly reinforced)
  // No additional namespace needed here, as Open Graph covers it
  // LinkedIn (also uses Open Graph, but we can add specific meta tags if needed)
  // Pinterest (uses Open Graph, but we can specify additional properties)
  // Additional metadata for broader social media compatibility
  metadataBase: new URL("https://eldermap.vercel.app"),
  robots: "index, follow",
  // Custom meta tags for broader social media compatibility (optional)
  other: {
    // Pinterest-specific tags (optional, as it uses Open Graph)
    "pinterest:description": "สำรวจมรดกทางวัฒนธรรมและประวัติศาสตร์อันหลากหลายของจังหวัดในประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบของเรา",
    "pinterest:image": "/logo.png",
    // LinkedIn-specific tags (optional, as it uses Open Graph)
    "linkedin:title": "Thai Provinces Interactive History Platform",
    "linkedin:description": "สำรวจมรดกทางวัฒนธรรมและประวัติศาสตร์อันหลากหลายของจังหวัดในประเทศไทยผ่านแพลตฟอร์มเชิงโต้ตอบของเรา",
    "linkedin:image": "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GlobalProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 md:px-8 lg:px-12">
              {children}
            </main>
            <Footer />
          </div>
        </GlobalProvider>
      </body>
    </html>
  );
}
