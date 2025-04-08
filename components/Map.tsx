import { District, HistoricalPeriod } from "@/lib/districts";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff, Grid, MapPin, Home, Type, Menu, X } from "lucide-react";
import { throttle } from "lodash";
import { db } from "@/lib/firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { useTheme } from "next-themes";

interface MapProps {
  districts: District[];
  selectedDistricts: District[];
  onDistrictToggle: (district: District) => void;
  selectedPeriod: HistoricalPeriod | null;
  provinceId?: string;
  onReset?: (isMobile?: boolean) => void; // Update the type to accept isMobile
}

interface DistrictWithProvince extends District {
  provinceId: string;
}

// Utility to determine if a color is dark (for text contrast)
const isColorDark = (color: string): boolean => {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

export default function Map({
  districts: initialDistricts,
  selectedDistricts,
  onDistrictToggle,
  selectedPeriod,
  provinceId,
  onReset,
}: MapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [mapScale, setMapScale] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showCenterDot, setShowCenterDot] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [touchDistance, setTouchDistance] = useState<number | null>(null);
  const [districts, setDistricts] = useState<DistrictWithProvince[]>([]);
  const [menuOpen, setMenuOpen] = useState(true);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapPosition, setLastTapPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Fetch districts from Firebase only when provinceId changes
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        if (provinceId) {
          const districtsSnapshot = await getDocs(collection(db, `provinces/${provinceId}/districts`));
          const provinceDistricts: DistrictWithProvince[] = districtsSnapshot.docs.map((districtDoc) => ({
            ...districtDoc.data(),
            id: districtDoc.id,
            provinceId,
          } as DistrictWithProvince));
          setDistricts(provinceDistricts);
        } else {
          const provincesSnapshot = await getDocs(collection(db, "provinces"));
          const allDistricts: DistrictWithProvince[] = [];
          const fetchPromises = provincesSnapshot.docs.map(async (provinceDoc) => {
            const provId = provinceDoc.id;
            const districtsSnapshot = await getDocs(collection(db, `provinces/${provId}/districts`));
            districtsSnapshot.forEach((districtDoc) => {
              allDistricts.push({
                ...districtDoc.data(),
                id: districtDoc.id,
                provinceId: provId,
              } as DistrictWithProvince);
            });
          });

          await Promise.all(fetchPromises);
          setDistricts(allDistricts);
        }
      } catch (error) {
        console.error("Error fetching districts:", error);
      }
    };

    fetchDistricts();
  }, [provinceId]);

  // Removed this useEffect to prevent zoom reset on district selection
  // useEffect(() => {
  //   setMapScale(1);
  //   setMapPosition({ x: 0, y: 0 });
  // }, [selectedDistricts]);

  // Calculate if a tap is inside a district
  const isInsideDistrict = (x: number, y: number, district: DistrictWithProvince): boolean => {
    if (!mapRef.current || !mapContainerRef.current) return false;

    const svgRect = mapRef.current.getBoundingClientRect();
    const containerRect = mapContainerRef.current.getBoundingClientRect();

    const relX = x - containerRect.left;
    const relY = y - containerRect.top;

    const svgPoint = mapRef.current.createSVGPoint();
    svgPoint.x = relX;
    svgPoint.y = relY;

    const transformedPoint = svgPoint.matrixTransform(mapRef.current.getScreenCTM()?.inverse());

    const { coordinates } = district;
    const districtCenterX = coordinates.x + coordinates.width / 2;
    const districtCenterY = coordinates.y + coordinates.height / 2;

    const dx = transformedPoint.x - districtCenterX;
    const dy = transformedPoint.y - districtCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const tapRadius = isMobile
      ? Math.min(coordinates.width, coordinates.height) * 0.5
      : Math.min(coordinates.width, coordinates.height) * 0.3;

    return distance <= tapRadius;
  };

  // Touch handling for district selection and map movement
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const touchPosition = { x: touch.clientX, y: touch.clientY };

        if (
          now - lastTapTime < 300 &&
          Math.abs(touchPosition.x - lastTapPosition.x) < 10 &&
          Math.abs(touchPosition.y - lastTapPosition.y) < 10
        ) {
          e.preventDefault();
        } else {
          setLastTapTime(now);
          setLastTapPosition(touchPosition);

          const tappedDistrict = districts.find((district) =>
            isInsideDistrict(touch.clientX, touch.clientY, district)
          );

          if (tappedDistrict) {
            e.preventDefault();
            onDistrictToggle(tappedDistrict);
            if ("vibrate" in navigator) navigator.vibrate(50);
          } else {
            setIsDragging(true);
            setDragStart({
              x: touch.clientX - mapPosition.x,
              y: touch.clientY - mapPosition.y,
            });
          }
        }
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        setTouchDistance(distance);
      }
    },
    [districts, lastTapTime, lastTapPosition, mapPosition, onDistrictToggle]
  );

  const handleTouchMove = useCallback(
    throttle(
      (e: React.TouchEvent) => {
        e.preventDefault();
        const touchCount = e.touches.length;

        if (touchCount === 1 && isDragging) {
          const touch = e.touches[0];
          setMapPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
          });
        } else if (touchCount === 2) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

          if (touchDistance !== null) {
            const scaleFactor = distance / touchDistance;
            const newScale = Math.max(0.5, Math.min(3.5, mapScale * scaleFactor));

            const midX = (touch1.clientX + touch2.clientX) / 2;
            const midY = (touch1.clientY + touch2.clientY) / 2;

            if (mapContainerRef.current) {
              const rect = mapContainerRef.current.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;

              const deltaX = (midX - centerX) * (1 - scaleFactor);
              const deltaY = (midY - centerY) * (1 - scaleFactor);

              setMapPosition({
                x: mapPosition.x + deltaX,
                y: mapPosition.y + deltaY,
              });
            }

            setMapScale(newScale);
            setTouchDistance(distance);
          }
        }
      },
      16
    ),
    [isDragging, dragStart, touchDistance, mapScale, mapPosition]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setTouchDistance(null);
  }, []);

  // Mouse handling for desktop
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
    },
    [mapPosition]
  );

  const handleMouseMove = useCallback(
    throttle(
      (e: React.MouseEvent) => {
        if (isDragging) {
          setMapPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          });
        }
      },
      16
    ),
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const scaleFactor = 0.15;
      const newScale = Math.max(0.5, Math.min(3.5, mapScale + (e.deltaY < 0 ? scaleFactor : -scaleFactor)));

      const rect = mapContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const deltaX = (mouseX - centerX) * (1 - newScale / mapScale);
        const deltaY = (mouseY - centerY) * (1 - newScale / mapScale);

        setMapPosition({
          x: mapPosition.x + deltaX,
          y: mapPosition.y + deltaY,
        });
      }

      setMapScale(newScale);
    },
    [mapScale, mapPosition]
  );

  const handleReset = useCallback(() => {
    setMapScale(1);
    setMapPosition({ x: 0, y: 0 });
    if (onReset) onReset(isMobile); // Pass isMobile to onReset
  }, [onReset, isMobile]);

  // Color utilities
  const getDistrictColor = (district: District) =>
    selectedDistricts.some((d) => d.id === district.id) && selectedPeriod
      ? selectedPeriod.color
      : district.historicalColor || "#d3d3d3";

  const getCollabColor = (district: District) =>
    district.collab?.isActive ? "rgba(255, 215, 0, 0.5)" : getDistrictColor(district);

  const getLineColor = useCallback(() => {
    const bgColor = resolvedTheme === "dark" ? "#0f0f1a" : "#ffffff";
    return isColorDark(bgColor) ? "#e0e0ff" : "#171717";
  }, [resolvedTheme]);

  const getTextColor = useCallback(
    (district: District) => {
      const bgColor = resolvedTheme === "dark" ? "#0f0f1a" : "#ffffff";
      return isColorDark(bgColor) ? "#e0e0ff" : "#171717";
    },
    [resolvedTheme]
  );

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const viewBox = "0 0 600 400";

  return (
    <div
      className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[75vh] rounded-xl overflow-hidden bg-card/50 border border-glass-border shadow-md glass-effect"
      style={{ touchAction: "none" }}
      ref={mapContainerRef}
    >
      {/* Mobile menu toggle button */}
      {isMobile && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMenu}
          className="absolute top-4 left-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-card/80 text-primary border border-primary/50 shadow-md"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          title={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </motion.button>
      )}

      {/* Control panel */}
      <AnimatePresence>
        {(!isMobile || menuOpen) && (
          <motion.div
            initial={isMobile ? { opacity: 0, x: -50 } : { opacity: 1 }}
            animate={{ opacity: 1, x: 0 }}
            exit={isMobile ? { opacity: 0, x: -50 } : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 right-4 z-20 bg-card/80 rounded-full p-2 flex flex-col gap-2 shadow-md"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMapScale((prev) => Math.min(prev + 0.25, 3.5))}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleReset}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/50"
              aria-label="Reset map"
              title="Set to center"
            >
              <Home className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMapScale((prev) => Math.max(prev - 0.25, 0.5))}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowGrid((prev) => !prev)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                showGrid ? "bg-primary/30 text-primary" : "bg-card text-foreground/70"
              } hover:bg-primary/40 border border-primary/50`}
              aria-label={showGrid ? "Hide grid" : "Show grid"}
              title={showGrid ? "Hide grid" : "Show grid"}
            >
              <Grid className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCenterDot((prev) => !prev)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                showCenterDot ? "bg-secondary/30 text-secondary" : "bg-card text-foreground/70"
              } hover:bg-secondary/40 border border-secondary/50`}
              aria-label={showCenterDot ? "Hide center dot" : "Show center dot"}
              title={showCenterDot ? "Hide center dot" : "Show center dot"}
            >
              <MapPin className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNames((prev) => !prev)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                showNames ? "bg-accent/30 text-accent" : "bg-card text-foreground/70"
              } hover:bg-accent/40 border border-accent/50`}
              aria-label={showNames ? "Hide names" : "Show names"}
              title={showNames ? "Hide names" : "Show names"}
            >
              <Type className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-4 z-20 bg-card/80 rounded-xl p-4 shadow-md max-w-xs w-full sm:max-w-sm glass-effect"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-thai font-medium text-foreground/70">อำเภอ</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLegend(false)}
                className="text-secondary"
                aria-label="Hide legend"
                title="Hide legend"
              >
                <EyeOff className="w-5 h-5" />
              </motion.button>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {districts.slice(0, 6).map((district) => (
                <div key={district.id} className="flex items-center">
                  <div
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: getCollabColor(district) }}
                  />
                  <span className="text-xs font-thai text-foreground/80 truncate max-w-[100px] sm:max-w-[120px]">
                    {district.thaiName}
                  </span>
                </div>
              ))}
              {districts.length > 6 && (
                <span className="text-xs text-foreground/70">+{districts.length - 6} เพิ่มเติม</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend toggle button */}
      {!showLegend && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowLegend(true)}
          className="absolute bottom-4 left-4 z-20 bg-card/80 rounded-full p-2 text-primary border border-primary/50"
          aria-label="Show legend"
          title="Show legend"
        >
          <Eye className="w-5 h-5" />
        </motion.button>
      )}

      {/* Hovered district info */}
      <AnimatePresence>
        {hoveredDistrict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-4 z-20 bg-card/80 rounded-lg p-3 shadow-md max-w-xs w-full glass-effect"
            style={{ left: isMobile ? "60px" : "16px" }}
          >
            <span className="text-sm font-thai font-medium text-foreground">{hoveredDistrict}</span>
            {districts.find((d) => d.thaiName === hoveredDistrict)?.collab?.isActive && (
              <div className="mt-1 text-xs text-yellow-500">
                Collab: {districts.find((d) => d.thaiName === hoveredDistrict)?.collab?.novelTitle}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main map container */}
      <div
        className="w-full h-full select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <motion.div
          animate={{ x: mapPosition.x, y: mapPosition.y, scale: mapScale }}
          transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
          className="w-full h-full flex items-center justify-center"
        >
          <svg
            ref={mapRef}
            viewBox={viewBox}
            className="w-full h-full max-w-full max-h-full"
            preserveAspectRatio="xMidYMid meet"
            role="region"
            aria-label={`แผนที่ของ ${districts.length} อำเภอ`}
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity="0.15"
                />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="lineColor">
                <feColorMatrix
                  type="matrix"
                  values={`0 0 0 0 ${parseInt(getLineColor().slice(1, 3), 16) / 255}
                          0 0 0 0 ${parseInt(getLineColor().slice(3, 5), 16) / 255}
                          0 0 0 0 ${parseInt(getLineColor().slice(5, 7), 16) / 255}
                          0 0 0 1 0`}
                />
              </filter>
              <filter id="districtHighlight" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--primary)" floodOpacity="0.7" />
              </filter>
              <filter id="textShadow">
                <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Background grid */}
            {showGrid && <rect width="600" height="400" fill="url(#grid)" opacity="0.4" />}

            {/* Center dot */}
            {showCenterDot && (
              <circle
                cx="300"
                cy="200"
                r="5"
                fill="var(--secondary)"
                stroke="var(--foreground)"
                strokeWidth="2"
                filter="url(#glow)"
              />
            )}

            {/* Districts */}
            <g>
              {districts.map((district) => {
                const isSelected = selectedDistricts.some((d) => d.id === district.id);
                const { x, y, width, height } = district.coordinates;
                const centerX = x + width / 2;
                const centerY = y + height / 2;

                return (
                  <motion.g
                    key={district.id}
                    initial={{ opacity: 0.8 }}
                    animate={{
                      opacity: hoveredDistrict === district.thaiName ? 1 : 0.8, // Only change opacity on hover
                      scale: hoveredDistrict === district.thaiName ? 1.05 : 1,  // Only scale on hover
                    }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => setHoveredDistrict(district.thaiName)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                  >
                    {/* District shape */}
                    {district.mapImageUrl ? (
                      <image
                        href={district.mapImageUrl}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        preserveAspectRatio="xMidYMid slice"
                        opacity={isSelected ? 1 : 0.8}
                        filter={isSelected ? "url(#districtHighlight)" : "url(#lineColor)"}
                        className="transition-all duration-300"
                        aria-label={`แผนที่ของ ${district.thaiName}`}
                      />
                    ) : (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={getCollabColor(district)}
                        stroke="var(--foreground)"
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeOpacity={isSelected ? 0.9 : 0.4}
                        className="transition-all duration-300"
                        filter={isSelected ? "url(#districtHighlight)" : ""}
                      />
                    )}

                    {/* Clickable area - transparent circle at district center */}
                    <circle
                      cx={centerX}
                      cy={centerY}
                      r={Math.min(width, height) * 0.5}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth="1"
                      className="cursor-pointer"
                      onClick={() => {
                        onDistrictToggle(district);
                        if ("vibrate" in navigator) navigator.vibrate(50);
                      }}
                      role="button"
                      aria-label={`เลือก ${district.thaiName}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDistrictToggle(district);
                          if ("vibrate" in navigator) navigator.vibrate(50);
                        }
                      }}
                    />

                    {/* District name */}
                    {showNames && (
                      <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fill={getTextColor(district)}
                        fontSize={isMobile ? "10px" : "12px"}
                        fontWeight={isSelected ? "bold" : "normal"}
                        className="font-thai select-none"
                        opacity={isSelected || hoveredDistrict === district.thaiName ? 1 : 0.8}
                        filter="url(#textShadow)"
                        onClick={() => {
                          onDistrictToggle(district);
                          if ("vibrate" in navigator) navigator.vibrate(50);
                        }}
                      >
                        {district.thaiName}
                      </text>
                    )}
                  </motion.g>
                );
              })}
            </g>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}