"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase-config";
import Map from "@/components/Map";
import PeriodSelector from "@/components/PeriodSelector";
import DistrictInfo from "@/components/DistrictInfo";
import { District, HistoricalPeriod } from "@/lib/districts";
import { Province } from "@/lib/provinces";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Maximize, Minimize, Search, XCircle } from "lucide-react";
import Loading from "@/components/Loading";
import { useDebounce } from "use-debounce";

export default function Home() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistricts, setSelectedDistricts] = useState<District[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<HistoricalPeriod | null>(null);
  const [allPeriods, setAllPeriods] = useState<HistoricalPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [debouncedSearch] = useDebounce(provinceSearch, 300);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const lastWindowWidth = useRef<number>(window.innerWidth);

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("thaiTemporalPortalState");
    if (savedState) {
      try {
        const { provinceId, provinceSearch } = JSON.parse(savedState);
        setProvinceSearch(provinceSearch || "");
      } catch (err) {
        console.error("Error parsing saved state:", err);
      }
    }
  }, []);

  // Fetch provinces and districts with caching
  const fetchProvinces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provincesSnapshot = await getDocs(collection(db, "provinces"));
      const provincesData: Province[] = [];
      const periodsSet = new Set<string>();
      const periodsData: HistoricalPeriod[] = [];

      for (const provinceDoc of provincesSnapshot.docs) {
        const provinceData = provinceDoc.data();
        const districtsSnapshot = await getDocs(collection(db, `provinces/${provinceDoc.id}/districts`));
        const districtsData: District[] = districtsSnapshot.docs.map((doc) => {
          const district = doc.data() as District;
          district.id = doc.id;
          district.historicalPeriods.forEach((period) => {
            if (!periodsSet.has(period.era)) {
              periodsSet.add(period.era);
              periodsData.push(period);
            }
          });
          return district;
        });

        provincesData.push({
          id: provinceDoc.id,
          name: provinceData.name,
          thaiName: provinceData.thaiName,
          totalArea: provinceData.totalArea || 0,
          districts: districtsData,
          historicalPeriods: provinceData.historicalPeriods || [],
          collabSymbol: provinceData.collabSymbol || undefined,
          tags: provinceData.tags || [],
          createdAt: provinceData.createdAt,
          createdBy: provinceData.createdBy || [],
          editor: provinceData.editor || [],
          lock: provinceData.lock || false,
          version: provinceData.version || 1,
          backgroundSvgPath: provinceData.backgroundSvgPath || undefined,
          backgroundImageUrl: provinceData.backgroundImageUrl || undefined,
          backgroundDimensions: provinceData.backgroundDimensions || undefined,
        });
      }

      setProvinces(provincesData);
      setAllPeriods(periodsData);

      const savedState = localStorage.getItem("thaiTemporalPortalState");
      if (savedState) {
        const { provinceId, selectedDistrictIds, selectedPeriodEra } = JSON.parse(savedState);
        const province = provincesData.find((p) => p.id === provinceId) || provincesData[0] || null;
        setSelectedProvince(province);
        if (province && selectedDistrictIds?.length) {
          setSelectedDistricts(province.districts.filter((d) => selectedDistrictIds.includes(d.id)));
        }
        if (selectedPeriodEra) {
          setSelectedPeriod(periodsData.find((p) => p.era === selectedPeriodEra) || null);
        }
      } else if (provincesData.length > 0) {
        setSelectedProvince(provincesData[0]);
      }
    } catch (err) {
      console.error("Error fetching provinces:", err);
      setError("Failed to load data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (!isLoading && selectedProvince) {
      localStorage.setItem(
        "thaiTemporalPortalState",
        JSON.stringify({
          provinceId: selectedProvince.id,
          provinceSearch,
          selectedDistrictIds: selectedDistricts.map((d) => d.id),
          selectedPeriodEra: selectedPeriod?.era,
        })
      );
    }
  }, [selectedProvince, selectedDistricts, selectedPeriod, provinceSearch, isLoading]);

  // Fetch data on mount
  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMapFullScreen(document.fullscreenElement === mapContainerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Open sidebar on screen size change from small to large or on zoom-out
  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (lastWindowWidth.current < 1024 && currentWidth >= 1024) {
        setIsSidebarOpen(true); // Open sidebar when switching from mobile to desktop
      }
      lastWindowWidth.current = currentWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handlers
  const toggleDistrict = useCallback((district: District) => {
    setSelectedDistricts((prev) =>
      prev.some((d) => d.id === district.id) ? prev.filter((d) => d.id !== district.id) : [...prev, district]
    );
    if (!selectedPeriod && district.historicalPeriods.length) {
      setSelectedPeriod(district.historicalPeriods[0]);
    }
  }, [selectedPeriod]);

  const selectAllDistricts = useCallback(() => {
    if (selectedProvince) setSelectedDistricts(selectedProvince.districts);
  }, [selectedProvince]);

  const clearSelection = useCallback(() => {
    setSelectedDistricts([]);
    setSelectedPeriod(null);
    setIsSidebarOpen(true); // Open sidebar on zoom-out/clear
  }, []);

  const handleProvinceChange = useCallback((province: Province | null) => {
    setSelectedProvince(province);
    setSelectedDistricts([]);
    setSelectedPeriod(null);
  }, []);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

  const toggleFullScreen = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (!isMapFullScreen) {
      mapContainerRef.current.requestFullscreen().catch((err) => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen().catch((err) => console.error("Exit fullscreen error:", err));
    }
  }, [isMapFullScreen]);

  const isDistrictSelected = useCallback(
    (district: District) => selectedDistricts.some((d) => d.id === district.id),
    [selectedDistricts]
  );

  const filteredProvinces = useMemo(
    () =>
      provinces.filter(
        (p) =>
          p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.thaiName.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [provinces, debouncedSearch]
  );

  if (isLoading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive text-xl font-thai">
        {error}
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full mt-3 max-w-7xl py-6 px-4 sm:px-6 lg:px-8 text-center"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-thai font-extrabold gradient-header">
          Thailand Temporal Portal
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-foreground/70 mt-2">
          สำรวจจังหวัดในประเทศไทยผ่านช่วงเวลาต่างๆ
        </p>
      </motion.header>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden w-full max-w-md px-4 sm:px-6 mb-4 flex justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSidebar}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary/10 text-primary border border-primary/30 shadow-md"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <span className="text-sm font-thai">{isSidebarOpen ? "Close" : "Controls"}</span>
          {isSidebarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row px-4 sm:px-6 lg:px-8 pb-6 gap-4 lg:gap-6 items-center justify-center">
        {/* Sidebar */}
        <AnimatePresence>
          {(isSidebarOpen || window.innerWidth >= 1024) && (
            <motion.aside
              ref={sidebarRef}
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md lg:w-80 xl:w-96 flex-shrink-0 bg-card border border-glass-border rounded-xl p-4 lg:p-6 shadow-lg lg:sticky lg:top-6 lg:self-start"
            >
              {selectedProvince ? (
                <div className="flex flex-col space-y-6">
                  <section className="space-y-3">
                    <h2 className="text-lg font-thai text-foreground/80 text-center">เลือกจังหวัด</h2>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground/50" />
                      <input
                        type="text"
                        placeholder="Search Province..."
                        value={provinceSearch}
                        onChange={(e) => setProvinceSearch(e.target.value)}
                        className="w-full p-2 pl-10 rounded-lg bg-card text-foreground border border-glass-border focus:ring-2 focus:ring-primary focus:outline-none placeholder-foreground/50 text-sm truncate"
                        aria-label="Search provinces"
                      />
                      {provinceSearch && (
                        <button
                          onClick={() => setProvinceSearch("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/50 hover:text-foreground"
                          aria-label="Clear search"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <select
                      className="w-full mt-2 p-2 rounded-lg bg-card border border-glass-border focus:ring-2 focus:ring-primary focus:outline-none text-foreground text-sm truncate"
                      value={selectedProvince?.id || ""}
                      onChange={(e) => {
                        const province = provinces.find((p) => p.id === e.target.value) || null;
                        handleProvinceChange(province);
                      }}
                      aria-label="Select province"
                    >
                      {filteredProvinces.map((province) => (
                        <option key={province.id} value={province.id} className="truncate">
                          {province.thaiName} ({province.name})
                        </option>
                      ))}
                    </select>
                  </section>
                  <section className="space-y-3">
                    <h2 className="text-lg font-thai text-foreground/80">ช่วงเวลาทางประวัติศาสตร์</h2>
                    <PeriodSelector
                      periods={selectedDistricts[0]?.historicalPeriods || selectedProvince.districts[0]?.historicalPeriods || []}
                      selectedPeriod={selectedPeriod}
                      onSelectPeriod={(period) => setSelectedPeriod(period)}
                    />
                  </section>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-thai text-foreground/80">อำเภอ</h2>
                      <span className="text-xs text-foreground/60">
                        {selectedDistricts.length} / {selectedProvince?.districts.length || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={selectAllDistricts}
                        className="flex-1 py-2 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 text-sm truncate"
                        aria-label="Select all districts"
                      >
                        Select All
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearSelection}
                        className="flex-1 py-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20 text-sm truncate"
                        aria-label="Clear district selection"
                      >
                        Clear
                      </motion.button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-glass-bg">
                      {selectedProvince?.districts.map((district) => (
                        <motion.button
                          key={district.id}
                          whileHover={{ scale: 1.00 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleDistrict(district)}
                          className={`w-full p-2 rounded-lg flex items-center gap-2 text-left border ${
                            isDistrictSelected(district)
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-card border-glass-border text-foreground/80 hover:bg-card/70"
                          }`}
                          aria-label={`Toggle ${district.thaiName} district`}
                        >
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: district.historicalColor }}
                          />
                          <span className="truncate text-sm">{district.thaiName}</span>
                        </motion.button>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-6 flex flex-col items-center justify-center h-full"
                >
                  <p className="text-foreground/70 text-lg font-thai mb-4">
                    Please select a province to begin exploring
                  </p>
                  <select
                    className="w-full max-w-xs p-2 rounded-lg bg-card border border-glass-border focus:ring-2 focus:ring-primary focus:outline-none text-foreground text-sm truncate"
                    value=""
                    onChange={(e) => {
                      const province = provinces.find((p) => p.id === e.target.value) || null;
                      handleProvinceChange(province);
                    }}
                    aria-label="Select province"
                  >
                    <option value="" disabled>
                      Choose a Province
                    </option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.id} className="truncate">
                        {province.thaiName} ({province.name})
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="w-full min-h-2xl flex-1 flex flex-col space-y-6">
          <motion.section
            ref={mapContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-card bg-opacity-10 border border-glass-border rounded-xl p-4 relative w-full max-w-4xl lg:max-w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="px-3 py-1 bg-primary/10 text-foreground rounded-lg border border-primary/30 text-sm truncate max-w-[50%]">
                {selectedProvince?.name || "No Province Selected"} (
                {selectedProvince?.thaiName || "เลือกจังหวัด"})
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleFullScreen}
                className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"
                aria-label={isMapFullScreen ? "Exit full screen" : "Enter full screen"}
              >
                {isMapFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </motion.button>
            </div>
            {selectedProvince && (
              <Map
                districts={[]} // Empty as Map.tsx fetches from Firebase
                selectedDistricts={selectedDistricts}
                onDistrictToggle={toggleDistrict}
                selectedPeriod={selectedPeriod}
                provinceId={selectedProvince.id} // Pass provinceId to Map.tsx
                onReset={(isMobile) => {
                  // Only open sidebar on reset if not on mobile, or keep it closed if already closed
                  if (!isMobile || window.innerWidth >= 768) {
                    setIsSidebarOpen(true);
                  }
                }}
              />
            )}
          </motion.section>

          <AnimatePresence>
            {selectedDistricts.length > 0 && selectedPeriod && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-card border border-glass-border rounded-xl p-4 w-full max-w-4xl lg:max-w-full"
              >
                <DistrictInfo
                  districts={selectedDistricts}
                  period={selectedPeriod}
                  provinceName={selectedProvince?.name || ""}
                  provinceData={selectedProvince}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}