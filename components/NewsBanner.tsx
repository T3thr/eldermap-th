'use client';

import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase-config'; // Adjust path to your Firebase config
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import About from './About';

interface Update {
  id: string;
  adminId: string;
  adminName: string;
  text: string;
  timestamp: Timestamp | string; // Allow both Timestamp object or string
}

const NewsBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);

  // Fetch updates from Firebase on mount
  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const updatesQuery = query(collection(db, 'updates'), orderBy('timestamp', 'desc'));
        const updatesSnapshot = await getDocs(updatesQuery);
        const updatesData = updatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Update));
        setUpdates(updatesData);
      } catch (error) {
        console.error('Error fetching updates:', error);
      }
    };

    fetchUpdates();

    // Check if user has previously dismissed the banner
    const bannerDismissed = localStorage.getItem('newsBannerDismissed');
    if (!bannerDismissed) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    if (dontShowAgain) {
      localStorage.setItem('newsBannerDismissed', 'true');
    }
  };

  const openAbout = () => {
    setShowAbout(true);
  };

  const closeAbout = () => {
    setShowAbout(false);
  };

  // Convert Firestore Timestamp to readable string
  const formatTimestamp = (timestamp: Timestamp | string): string => {
    if (typeof timestamp === 'string') {
      return timestamp; // If already a string, use it directly
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZone: 'UTC',
        timeZoneName: 'short',
      });
    }
    return 'Unknown date'; // Fallback for unexpected formats
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 relative glass-effect"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-foreground hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-accent/10"
                aria-label="dismiss"
              >
                <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.2 }}>
                  <X size={20} />
                </motion.div>
              </button>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-primary mb-3 flex items-center">
                  <Bell className="mr-2" size={22} />
                  Latest Updates
                </h3>

                {/* Section 1: Database Updates */}
                <div className="text-foreground dark:text-gray-300 space-y-3 p-3 bg-accent/5 rounded-lg border border-primary/10 mb-4">
                  <h4 className="text-sm font-semibold text-secondary">Recent Updates</h4>
                  {updates.length > 0 ? (
                    updates.slice(0, 3).map((update) => (
                      <p key={update.id} className="text-sm">
                        {update.text}{' '}
                        <span className="text-xs text-foreground/70">({formatTimestamp(update.timestamp)})</span>
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/70">No recent updates available.</p>
                  )}
                </div>

                {/* Section 2: Manual Updates */}
                <div className="text-foreground dark:text-gray-300 space-y-3 p-3 bg-accent/5 rounded-lg border border-primary/10">
                  <h4 className="text-sm font-semibold text-secondary">Announcements</h4>
                  <p>ยินดีต้อนรับ!</p>
                  <p>ที่แห่งนี้คือแพลตฟอร์มสำหรับสำรวจช่วงเวลาต่างๆในประเทศไทยด้วยเนื้อหาเชิงโต้ตอบ</p>
                </div>
              </div>

              <div className="flex items-center mb-5">
                <input
                  type="checkbox"
                  id="dontShowAgain"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-primary/30 focus:ring-primary"
                />
                <label htmlFor="dontShowAgain" className="ml-2 text-sm text-foreground dark:text-gray-300">
                  Do not show this again
                </label>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  onClick={openAbout}
                  className="flex-1 bg-accent/10 hover:bg-accent/20 text-foreground font-medium py-2 px-4 rounded-lg transition-colors border border-primary/10"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Learn More
                </motion.button>
                <motion.button
                  onClick={handleDismiss}
                  className="flex-1 bg-primary hover:bg-primary/90 text-background dark:text-black font-medium py-2 px-4 rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Got it!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbout && (
          <div className="fixed inset-0 z-[999]"> {/* Added z-50 here */}
            <About onClose={closeAbout} />
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NewsBanner;