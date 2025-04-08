// app/admin/map-editor/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, MapPin, Grid, Save, Plus, Trash2, Upload, Edit, X, Undo2, Redo2, Lock, Unlock, Search, Loader2, Users, Palette, Clock, Book, Globe, Send, LayoutList,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp, addDoc } from "firebase/firestore";
import debounce from "lodash/debounce";
import { District, HistoricalPeriod, Media, CollabData } from "@/lib/districts";
import { Province } from "@/lib/provinces";

// Firebase Config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Interfaces
interface ProvinceData {
  id: string;
  name: string;
  thaiName: string;
  totalArea: number;
  districts: DistrictData[];
  createdAt: Timestamp;
  createdBy: { id: string; name: string }[];
  lock: boolean;
  version: number;
  editor?: { id: string; name: string; role: "editor" | "viewer" }[];
  historicalPeriods?: HistoricalPeriod[];
  tags?: string[];
}

interface DistrictData {
  id: string;
  name: string;
  thaiName: string;
  historicalColor: string;
  coordinates: { x: number; y: number; width: number; height: number };
  historicalPeriods: HistoricalPeriod[];
  createdAt: Timestamp;
  createdBy: { id: string; name: string }[];
  lock: boolean;
  version: number;
  mapImageUrl?: string;
  culturalSignificance?: string;
  visitorTips?: string;
  editor?: { id: string; name: string; role: "editor" | "viewer" }[];
  collab?: CollabData;
}

interface EditAction {
  type: "updateDistrict" | "updateProvince" | "addProvince" | "addDistrict" | "uploadMedia" | "uploadMap" | "deleteDistrict" | "deleteProvince" | "updatePeriod" | "addPeriod" | "deletePeriod";
  data: any;
  previousData: any;
  timestamp: number;
  id: string;
}

interface FileUpload {
  file: File | null;
  previewUrl: string | null;
  type: "image" | "video" | "map";
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface CollaborationInvite {
  email: string;
  role: "editor" | "viewer";
}

interface CollaborationRequest {
  id: string;
  provinceId: string;
  districtId?: string;
  requesterId: string;
  requesterName: string;
  purpose: string;
  status: "pending" | "accepted" | "rejected";
  requestedAt: Timestamp;
}

interface UpdateEntry {
  id: string;
  text: string;
  adminId: string;
  adminName: string;
  timestamp: Timestamp;
  provinceId?: string;
  districtId?: string;
}

// Constants
const MAX_HISTORY_SIZE = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const REQUEST_TIMEOUT = 60 * 1000; // 1 minute

// Custom Hook for Map State
const useMapState = () => {
  const [mapScale, setMapScale] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingDistrict, setIsDraggingDistrict] = useState<string | null>(null);
  const debouncedSetMapPosition = useMemo(() => debounce((pos: { x: number; y: number }) => setMapPosition(pos), 16), []);

  return {
    mapScale,
    setMapScale,
    mapPosition,
    setMapPosition,
    isDraggingMap,
    setIsDraggingMap,
    dragStart,
    setDragStart,
    isDraggingDistrict,
    setIsDraggingDistrict,
    debouncedSetMapPosition,
  };
};

// Map Component
const MapComponent: React.FC<{
  selectedProvince: ProvinceData | null;
  selectedDistrict: DistrictData | null;
  setSelectedDistrict: (district: DistrictData | null) => void;
  updateDistrictCoordinates: (district: DistrictData, coords: DistrictData["coordinates"]) => void;
  canEdit: (item: DistrictData | null) => boolean;
  mapState: ReturnType<typeof useMapState>;
}> = ({ selectedProvince, selectedDistrict, setSelectedDistrict, updateDistrictCoordinates, canEdit, mapState }) => {
  const { mapScale, mapPosition, isDraggingMap, setIsDraggingMap, dragStart, setDragStart, isDraggingDistrict, setIsDraggingDistrict, debouncedSetMapPosition } = mapState;
  const [showGrid, setShowGrid] = useState(true);
  const [showCenter, setShowCenter] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isDraggingDistrict) {
      setIsDraggingMap(true);
      setDragStart({ x: e.clientX - mapPosition.x, y: e.clientY - mapPosition.y });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isDraggingDistrict) {
      const touch = e.touches[0];
      setIsDraggingMap(true);
      setDragStart({ x: touch.clientX - mapPosition.x, y: touch.clientY - mapPosition.y });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDraggingMap) {
        debouncedSetMapPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
      if (isDraggingDistrict && selectedProvince && canEdit(selectedDistrict)) {
        const district = selectedProvince.districts.find((d) => d.id === isDraggingDistrict);
        if (district) {
          const newX = (e.clientX - dragStart.x) / mapScale + district.coordinates.x;
          const newY = (e.clientY - dragStart.y) / mapScale + district.coordinates.y;
          updateDistrictCoordinates(district, { ...district.coordinates, x: newX, y: newY });
        }
      }
    },
    [isDraggingMap, isDraggingDistrict, dragStart, mapScale, selectedProvince, selectedDistrict, debouncedSetMapPosition, updateDistrictCoordinates, canEdit]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (isDraggingMap) {
        debouncedSetMapPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
      }
      if (isDraggingDistrict && selectedProvince && canEdit(selectedDistrict)) {
        const district = selectedProvince.districts.find((d) => d.id === isDraggingDistrict);
        if (district) {
          const newX = (touch.clientX - dragStart.x) / mapScale + district.coordinates.x;
          const newY = (touch.clientY - dragStart.y) / mapScale + district.coordinates.y;
          updateDistrictCoordinates(district, { ...district.coordinates, x: newX, y: newY });
        }
      }
    },
    [isDraggingMap, isDraggingDistrict, dragStart, mapScale, selectedProvince, selectedDistrict, debouncedSetMapPosition, updateDistrictCoordinates, canEdit]
  );

  const handleMouseUp = () => {
    setIsDraggingMap(false);
    setIsDraggingDistrict(null);
  };

  const handleTouchEnd = () => {
    setIsDraggingMap(false);
    setIsDraggingDistrict(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 0.15;
    mapState.setMapScale((prev) => Math.max(0.5, Math.min(3.5, prev + (e.deltaY < 0 ? scaleFactor : -scaleFactor))));
  };

  const handleDistrictMouseDown = (e: React.MouseEvent, districtId: string) => {
    e.stopPropagation();
    setIsDraggingDistrict(districtId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDistrictTouchStart = (e: React.TouchEvent, districtId: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDraggingDistrict(districtId);
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  return (
    <motion.div className="w-full bg-card rounded-xl shadow-lg overflow-hidden">
      <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh] w-full">
        <div className="absolute top-4 right-4 z-20 bg-glass-bg rounded-full p-2 flex flex-col gap-2 shadow-[0_0_10px_rgba(0,212,255,0.3)]">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => mapState.setMapScale((prev) => Math.min(prev + 0.25, 3.5))} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50" aria-label="Zoom in">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { mapState.setMapScale(1); mapState.setMapPosition({ x: 0, y: 0 }); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/50" aria-label="Reset map">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => mapState.setMapScale((prev) => Math.max(prev - 0.25, 0.5))} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50" aria-label="Zoom out">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowGrid((prev) => !prev)} className={`w-8 h-8 flex items-center justify-center rounded-full ${showGrid ? "bg-primary/30 text-primary" : "bg-card text-foreground/70"} hover:bg-primary/40 border border-primary/50`} aria-label={showGrid ? "Hide grid" : "Show grid"}>
            <Grid className="w-4 h-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowCenter((prev) => !prev)} className={`w-8 h-8 flex items-center justify-center rounded-full ${showCenter ? "bg-secondary/30 text-secondary" : "bg-card text-foreground/70"} hover:bg-secondary/40 border border-secondary/50`} aria-label={showCenter ? "Hide center marker" : "Show center marker"}>
            <MapPin className="w-4 h-4" />
          </motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowLabels((prev) => !prev)} className={`w-8 h-8 flex items-center justify-center rounded-full ${showLabels ? "bg-accent/30 text-accent" : "bg-card text-foreground/70"} hover:bg-accent/40 border border-accent/50`} aria-label={showLabels ? "Hide labels" : "Show labels"}>
            <Book className="w-4 h-4" />
          </motion.button>
        </div>
        <div
          className="w-full h-full cursor-grab touch-pan-x touch-pan-y"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ cursor: isDraggingMap ? "grabbing" : "grab" }}
          role="region"
          aria-label="Interactive map"
        >
          <motion.div animate={{ x: mapPosition.x, y: mapPosition.y, scale: mapScale }} transition={{ duration: 0.15 }} className="w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 600 400" className="w-full h-auto">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--foreground)" strokeOpacity="0.15" />
                </pattern>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {showGrid && <rect width="600" height="400" fill="url(#grid)" opacity="0.4" />}
              {showCenter && <circle cx="300" cy="200" r="5" fill="var(--secondary)" stroke="var(--foreground)" strokeWidth="2" filter="url(#glow)" />}
              <g>
                {selectedProvince?.districts.map((district) => (
                  <motion.g
                    key={district.id}
                    whileHover={{ scale: canEdit(district) ? 1.08 : 1 }}
                    whileTap={{ scale: canEdit(district) ? 0.95 : 1 }}
                    onClick={() => setSelectedDistrict(district)}
                    onMouseDown={(e) => canEdit(district) && handleDistrictMouseDown(e, district.id)}
                    onTouchStart={(e) => canEdit(district) && handleDistrictTouchStart(e, district.id)}
                    role="button"
                    aria-label={`Select ${district.name}`}
                  >
                    {district.mapImageUrl ? (
                      <image
                        x={district.coordinates.x}
                        y={district.coordinates.y}
                        width={district.coordinates.width}
                        height={district.coordinates.height}
                        href={district.mapImageUrl}
                        className="transition-all duration-300"
                        style={{
                          filter: selectedDistrict?.id === district.id ? "url(#glow)" : "",
                          cursor: isDraggingDistrict === district.id ? "grabbing" : "pointer",
                        }}
                      />
                    ) : (
                      <rect
                        x={district.coordinates.x}
                        y={district.coordinates.y}
                        width={district.coordinates.width}
                        height={district.coordinates.height}
                        fill={district.historicalColor}
                        stroke="var(--foreground)"
                        strokeWidth={selectedDistrict?.id === district.id ? 3 : 1.5}
                        strokeOpacity={selectedDistrict?.id === district.id ? 0.9 : 0.4}
                        className="transition-all duration-300"
                        style={{
                          filter: selectedDistrict?.id === district.id ? "url(#glow)" : "",
                          cursor: isDraggingDistrict === district.id ? "grabbing" : "pointer",
                        }}
                      />
                    )}
                    {showLabels && (
                      <text
                        x={district.coordinates.x + district.coordinates.width / 2}
                        y={district.coordinates.y + district.coordinates.height / 2}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fill={isColorDark(district.historicalColor) ? "#fff" : "#333"}
                        fontSize="14"
                        fontWeight={selectedDistrict?.id === district.id ? "bold" : "normal"}
                        className="font-thai select-none"
                        opacity={selectedDistrict?.id === district.id ? 1 : 0.8}
                      >
                        {district.thaiName}
                      </text>
                    )}
                  </motion.g>
                ))}
              </g>
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ProvinceSelector Component
const ProvinceSelector: React.FC<{
  provinces: ProvinceData[];
  filteredProvinces: ProvinceData[];
  selectedProvince: ProvinceData | null;
  setSelectedProvince: (province: ProvinceData | null) => void;
  setSelectedDistrict: (district: DistrictData | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleLock: (item: ProvinceData, type: "province") => void;
  deleteProvince: (province: ProvinceData) => void;
  updateProvinceName: (province: ProvinceData, name: string, thaiName: string) => void;
  canEdit: (item: ProvinceData | null) => boolean;
  loading: boolean;
  setIsAddProvinceModalOpen: (open: boolean) => void;
  setIsCollaborationModalOpen: (open: boolean) => void;
  requestEditorAccess: (province: ProvinceData, purpose: string) => void;
}> = ({
  provinces,
  filteredProvinces,
  selectedProvince,
  setSelectedProvince,
  setSelectedDistrict,
  searchQuery,
  setSearchQuery,
  toggleLock,
  deleteProvince,
  updateProvinceName,
  canEdit,
  loading,
  setIsAddProvinceModalOpen,
  setIsCollaborationModalOpen,
  requestEditorAccess,
}) => {
  const [editingProvinceName, setEditingProvinceName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [requestPurpose, setRequestPurpose] = useState("");
  const [requestDisabled, setRequestDisabled] = useState<Record<string, boolean>>({});
  const { data: session } = useSession();

  const handleRequest = (province: ProvinceData) => {
    if (!requestPurpose.trim()) return;
    requestEditorAccess(province, requestPurpose);
    setRequestDisabled((prev) => ({ ...prev, [province.id]: true }));
    setTimeout(() => setRequestDisabled((prev) => ({ ...prev, [province.id]: false })), REQUEST_TIMEOUT);
    setRequestPurpose("");
    setDropdownOpen(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Provinces</h2>
        <div className="flex flex-wrap gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsCollaborationModalOpen(true)} className="px-3 py-1 sm:px-4 sm:py-2 bg-accent text-background rounded-lg shadow-lg flex items-center gap-2" aria-label="Manage collaboration">
            <Users className="w-4 h-4" /> Collaborate
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAddProvinceModalOpen(true)} className="px-3 py-1 sm:px-4 sm:py-2 bg-primary text-background rounded-lg shadow-lg flex items-center gap-2" aria-label="Add new province">
            <Plus className="w-4 h-4" /> Add
          </motion.button>
        </div>
      </div>
      <div className="flex items-center bg-card border border-primary rounded-lg focus-within:ring-2 focus-within:ring-primary mb-4">
        <Search className="w-4 h-4 text-foreground/70 ml-3" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search provinces..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 bg-transparent text-foreground border-0 rounded-lg focus:ring-0 focus:outline-none"
          aria-label="Search provinces"
        />
      </div>
      <div className="max-h-60 overflow-y-auto bg-card rounded-lg shadow-inner">
        {loading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredProvinces.length === 0 ? (
          <p className="p-4 text-foreground/70">No provinces found.</p>
        ) : (
          filteredProvinces.map((province) => (
            <div key={province.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 hover:bg-background rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap w-full">
                {editingProvinceName === province.id ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <input
                      type="text"
                      value={province.name}
                      onChange={(e) => setSelectedProvince({ ...province, name: e.target.value })}
                      className="p-2 bg-card text-foreground border border-primary rounded-lg flex-1 focus:ring-2 focus:ring-primary"
                      disabled={!canEdit(province)}
                      aria-label={`Edit name of ${province.name}`}
                    />
                    <input
                      type="text"
                      value={province.thaiName}
                      onChange={(e) => setSelectedProvince({ ...province, thaiName: e.target.value })}
                      className="p-2 bg-card text-foreground border border-primary rounded-lg flex-1 focus:ring-2 focus:ring-primary"
                      disabled={!canEdit(province)}
                      aria-label={`Edit Thai name of ${province.name}`}
                    />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { updateProvinceName(province, province.name, province.thaiName); setEditingProvinceName(null); }} className="px-2 py-1 bg-success text-background rounded-lg shadow-lg" disabled={!canEdit(province)} aria-label="Save province name changes">
                      Save
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingProvinceName(null)} className="px-2 py-1 bg-destructive text-background rounded-lg shadow-lg" aria-label="Cancel editing province name">
                      Cancel
                    </motion.button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedProvince(province); setSelectedDistrict(province.districts[0] || null); }}
                      className={`px-3 py-96 sm:px-4 sm:py-2 rounded-lg shadow-lg flex-1 text-left ${selectedProvince?.id === province.id ? "bg-primary text-background" : "bg-secondary text-foreground"}`}
                      aria-label={`Select ${province.name}`}
                    >
                      {province.thaiName} ({province.name})
                    </motion.button>
                    <div className="relative">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setDropdownOpen(dropdownOpen === province.id ? null : province.id)}
                        className="px-2 py-1 bg-secondary text-foreground rounded-lg shadow-lg"
                        aria-label="More options"
                      >
                        <LayoutList className="w-4 h-4" />
                      </motion.button>
                      <AnimatePresence>
                        {dropdownOpen === province.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg z-10 p-2"
                          >
                            {canEdit(province) && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleLock(province, "province")}
                                className="w-full px-2 py-1 text-left text-foreground hover:bg-primary/20 rounded-md flex items-center gap-2"
                                aria-label={province.lock ? `Unlock ${province.name}` : `Lock ${province.name}`}
                              >
                                {province.lock ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                {province.lock ? "Unlock" : "Lock"}
                              </motion.button>
                            )}
                            {province.createdBy.some((c) => c.id === session?.user?.id) && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => deleteProvince(province)}
                                className="w-full px-2 py-1 text-left text-destructive hover:bg-destructive/20 rounded-md flex items-center gap-2"
                                aria-label={`Delete ${province.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </motion.button>
                            )}
                            {!canEdit(province) && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={requestPurpose}
                                  onChange={(e) => setRequestPurpose(e.target.value)}
                                  placeholder="Purpose of request"
                                  className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                                  aria-label="Request purpose"
                                />
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleRequest(province)}
                                  disabled={requestDisabled[province.id]}
                                  className="w-full px-2 py-1 text-left text-foreground hover:bg-secondary/20 rounded-md flex items-center gap-2 disabled:opacity-50"
                                  aria-label={`Request editor access for ${province.name}`}
                                >
                                  <Send className="w-4 h-4" />
                                  Request
                                </motion.button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

// District Editor Component
const DistrictEditor: React.FC<{
  selectedProvince: ProvinceData | null;
  selectedDistrict: DistrictData | null;
  updateDistrictCoordinates: (district: DistrictData, coords: DistrictData["coordinates"]) => void;
  updateDistrictColor: (district: DistrictData, color: string) => void;
  uploadMapImage: () => void;
  canEdit: (item: DistrictData | null) => boolean;
  toggleLock: (item: DistrictData, type: "district") => void;
  mapFile: FileUpload;
  setMapFile: (file: FileUpload) => void;
  mapImageUrlInput: string;
  setMapImageUrlInput: (url: string) => void;
  isUploading: boolean;
}> = ({
  selectedProvince,
  selectedDistrict,
  updateDistrictCoordinates,
  updateDistrictColor,
  uploadMapImage,
  canEdit,
  toggleLock,
  mapFile,
  setMapFile,
  mapImageUrlInput,
  setMapImageUrlInput,
  isUploading,
}) => {
  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) return false;
    return ALLOWED_IMAGE_TYPES.includes(file.type);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Map Editor</h2>
        {selectedDistrict && canEdit(selectedDistrict) && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleLock(selectedDistrict, "district")} className="px-2 py-1 bg-accent text-foreground rounded-lg shadow-lg" aria-label={selectedDistrict.lock ? `Unlock ${selectedDistrict.name}` : `Lock ${selectedDistrict.name}`}>
            {selectedDistrict.lock ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </motion.button>
        )}
      </div>
      {selectedDistrict ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">X Position</label>
              <input
                type="number"
                value={selectedDistrict.coordinates.x}
                onChange={(e) => updateDistrictCoordinates(selectedDistrict, { ...selectedDistrict.coordinates, x: Number(e.target.value) })}
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="X position"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Y Position</label>
              <input
                type="number"
                value={selectedDistrict.coordinates.y}
                onChange={(e) => updateDistrictCoordinates(selectedDistrict, { ...selectedDistrict.coordinates, y: Number(e.target.value) })}
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="Y position"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Width</label>
              <input
                type="number"
                value={selectedDistrict.coordinates.width}
                onChange={(e) => updateDistrictCoordinates(selectedDistrict, { ...selectedDistrict.coordinates, width: Number(e.target.value) })}
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="Width"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Height</label>
              <input
                type="number"
                value={selectedDistrict.coordinates.height}
                onChange={(e) => updateDistrictCoordinates(selectedDistrict, { ...selectedDistrict.coordinates, height: Number(e.target.value) })}
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="Height"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-foreground">Historical Color</label>
              <input
                type="color"
                value={rgbaToHex(selectedDistrict.historicalColor)}
                onChange={(e) => updateDistrictColor(selectedDistrict, hexToRgba(e.target.value, 0.5))}
                className="w-full h-10 p-1 bg-card text-foreground border border-primary rounded-lg disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="Historical color"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium mb-2 text-foreground">Upload Map Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && validateFile(file)) setMapFile({ file, previewUrl: URL.createObjectURL(file), type: "map" });
                }}
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg mb-2 disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="Upload map image"
              />
              {mapFile.previewUrl && (
                <div className="mt-2">
                  <img src={mapFile.previewUrl} alt="Map Preview" className="w-full h-32 object-cover rounded-lg" />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={uploadMapImage}
                    className="mt-2 w-full px-4 py-2 bg-primary text-background rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={isUploading}
                    aria-label="Upload map image"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {isUploading ? "Uploading..." : "Upload"}
                  </motion.button>
                </div>
              )}
              {selectedDistrict.mapImageUrl && !mapFile.previewUrl && <img src={selectedDistrict.mapImageUrl} alt="District Map" className="mt-2 w-full h-32 object-cover rounded-lg" />}
              <label className="block text-sm font-medium mt-4 text-foreground">Or Enter Map Image URL</label>
              <input
                type="text"
                value={mapImageUrlInput}
                onChange={(e) => setMapImageUrlInput(e.target.value)}
                placeholder="https://example.com/map.png"
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg mt-2 focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!canEdit(selectedDistrict)}
                aria-label="Map image URL"
              />
              {mapImageUrlInput && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={uploadMapImage}
                  className="mt-2 w-full px-4 py-2 bg-success text-background rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={isUploading}
                  aria-label="Add map URL"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isUploading ? "Adding..." : "Add URL"}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-foreground/70">Select a district to edit its map properties.</p>
      )}
    </motion.div>
  );
};

// DataEditor Component
const DataEditor: React.FC<{
  selectedProvince: ProvinceData | null;
  selectedDistrict: DistrictData | null;
  setSelectedDistrict: (district: DistrictData | null) => void;
  setSelectedProvince: (province: ProvinceData | null) => void;
  updateDistrictData: (district: DistrictData, data: Partial<DistrictData>) => void;
  deleteDistrict: (district: DistrictData) => void;
  canEdit: (item: ProvinceData | DistrictData | null) => boolean;
  setIsAddDistrictModalOpen: (open: boolean) => void;
  editMode: "province" | "district";
  setEditMode: (mode: "province" | "district") => void;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  setDeleteItem: (item: DistrictData | ProvinceData | null) => void;
  requestEditorAccess: (district: DistrictData, purpose: string) => void;
}> = ({
  selectedProvince,
  selectedDistrict,
  setSelectedDistrict,
  setSelectedProvince,
  updateDistrictData,
  deleteDistrict,
  canEdit,
  setIsAddDistrictModalOpen,
  editMode,
  setEditMode,
  setIsDeleteConfirmOpen,
  setDeleteItem,
  requestEditorAccess,
}) => {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [requestPurpose, setRequestPurpose] = useState("");
  const [requestDisabled, setRequestDisabled] = useState<Record<string, boolean>>({});

  const handleDeleteClick = (district: DistrictData) => {
    setDeleteItem(district);
    setIsDeleteConfirmOpen(true);
    setDropdownOpen(null);
  };

  const handleRequest = (district: DistrictData) => {
    if (!requestPurpose.trim()) return;
    requestEditorAccess(district, requestPurpose);
    setRequestDisabled((prev) => ({ ...prev, [district.id]: true }));
    setTimeout(() => setRequestDisabled((prev) => ({ ...prev, [district.id]: false })), REQUEST_TIMEOUT);
    setRequestPurpose("");
    setDropdownOpen(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Data Editor</h2>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditMode("province")} className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg shadow-lg ${editMode === "province" ? "bg-primary text-background" : "bg-secondary text-foreground"}`} aria-label="Edit province data">
            Province
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditMode("district")} className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg shadow-lg ${editMode === "district" ? "bg-primary text-background" : "bg-secondary text-foreground"}`} aria-label="Edit district data">
            District
          </motion.button>
        </div>
      </div>
      {editMode === "district" && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedProvince?.districts.map((district) => (
              <div key={district.id} className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDistrict(district)}
                  className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg shadow-lg ${selectedDistrict?.id === district.id ? "bg-primary text-background" : "bg-secondary text-foreground"}`}
                  aria-label={`Select ${district.name}`}
                >
                  {district.thaiName}
                </motion.button>
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDropdownOpen(dropdownOpen === district.id ? null : district.id)}
                    className="px-2 py-1 bg-secondary text-foreground rounded-lg shadow-lg"
                    aria-label="More options"
                  >
                    <LayoutList className="w-4 h-4" />
                  </motion.button>
                  <AnimatePresence>
                    {dropdownOpen === district.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg z-10 p-2"
                      >
                        {district.createdBy.some((c) => c.id === session?.user?.id) && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteClick(district)}
                            className="w-full px-2 py-1 text-left text-destructive hover:bg-destructive/20 rounded-md flex items-center gap-2"
                            aria-label={`Delete ${district.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </motion.button>
                        )}
                        {!canEdit(district) && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={requestPurpose}
                              onChange={(e) => setRequestPurpose(e.target.value)}
                              placeholder="Purpose of request"
                              className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                              aria-label="Request purpose"
                            />
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRequest(district)}
                              disabled={requestDisabled[district.id]}
                              className="w-full px-2 py-1 text-left text-foreground hover:bg-secondary/20 rounded-md flex items-center gap-2 disabled:opacity-50"
                              aria-label={`Request editor access for ${district.name}`}
                            >
                              <Send className="w-4 h-4" />
                              Request
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAddDistrictModalOpen(true)} className="w-full px-4 py-2 bg-success text-background rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50" disabled={!canEdit(selectedProvince)} aria-label="Add new district">
            <Plus className="w-4 h-4" /> Add District
          </motion.button>
          {selectedDistrict && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={selectedDistrict.name}
                  onChange={(e) => updateDistrictData(selectedDistrict, { name: e.target.value })}
                  className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={!canEdit(selectedDistrict)}
                  aria-label="District name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Thai Name</label>
                <input
                  type="text"
                  value={selectedDistrict.thaiName}
                  onChange={(e) => updateDistrictData(selectedDistrict, { thaiName: e.target.value })}
                  className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={!canEdit(selectedDistrict)}
                  aria-label="Thai name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Cultural Significance</label>
                <textarea
                  value={selectedDistrict.culturalSignificance || ""}
                  onChange={(e) => updateDistrictData(selectedDistrict, { culturalSignificance: e.target.value })}
                  className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={!canEdit(selectedDistrict)}
                  aria-label="Cultural significance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Visitor Tips</label>
                <textarea
                  value={selectedDistrict.visitorTips || ""}
                  onChange={(e) => updateDistrictData(selectedDistrict, { visitorTips: e.target.value })}
                  className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={!canEdit(selectedDistrict)}
                  aria-label="Visitor tips"
                />
              </div>
              <div className="flex flex-col justify-center items-center mt-4">
                <label className="block text-sm font-medium text-foreground">Created By</label>
                <input
                  type="text"
                  value={selectedDistrict.createdBy.map((creator) => creator.name).join(", ")}
                  disabled
                  className="w-fit p-2 mt-2 text-center text-foreground border border-primary rounded-full"
                  aria-label="Created by"
                />
              </div>
            </div>
          )}
        </>
      )}
      {editMode === "province" && selectedProvince && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={selectedProvince.name}
              onChange={(e) => setSelectedProvince({ ...selectedProvince, name: e.target.value })}
              className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={!canEdit(selectedProvince)}
              aria-label="Province name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Thai Name</label>
            <input
              type="text"
              value={selectedProvince.thaiName}
              onChange={(e) => setSelectedProvince({ ...selectedProvince, thaiName: e.target.value })}
              className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={!canEdit(selectedProvince)}
              aria-label="Thai name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Total Area (sq km)</label>
            <input
              type="number"
              value={selectedProvince.totalArea}
              onChange={(e) => setSelectedProvince({ ...selectedProvince, totalArea: Number(e.target.value) })}
              className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={!canEdit(selectedProvince)}
              aria-label="Total area"
            />
          </div>
          <div className="flex flex-col justify-center items-center mt-4">
            <label className="block text-sm font-medium text-foreground">Created By</label>
            <input
              type="text"
              value={selectedProvince.createdBy.map((creator) => creator.name).join(", ")}
              disabled
              className="w-fit p-2 mt-2 text-center text-foreground border border-primary rounded-full"
              aria-label="Created by"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Media Editor Component
const MediaEditor: React.FC<{
  selectedDistrict: DistrictData | null;
  updateDistrictData: (district: DistrictData, data: Partial<DistrictData>) => void;
  uploadMedia: (district: DistrictData, periodIndex: number) => void;
  canEdit: (item: DistrictData | null) => boolean;
  mediaFile: FileUpload;
  setMediaFile: (file: FileUpload) => void;
  mediaImageUrlInput: string;
  setMediaImageUrlInput: (url: string) => void;
  isUploading: boolean;
}> = ({
  selectedDistrict,
  updateDistrictData,
  uploadMedia,
  canEdit,
  mediaFile,
  setMediaFile,
  mediaImageUrlInput,
  setMediaImageUrlInput,
  isUploading,
}) => {
  const [activeTab, setActiveTab] = useState<"image" | "video" | "text">("image");
  const validateFile = (file: File, type: "image" | "video"): boolean => {
    if (file.size > MAX_FILE_SIZE) return false;
    return type === "image" ? ALLOWED_IMAGE_TYPES.includes(file.type) : ALLOWED_VIDEO_TYPES.includes(file.type);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-4 sm:p-6 rounded-xl shadow-lg">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Media Editor</h2>
      <div className="flex border-b border-primary mb-4">
        {["image", "video", "text"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 py-2 font-medium ${activeTab === tab ? "text-primary border-b-2 border-primary" : "text-foreground/70 hover:text-foreground"}`}
            aria-label={`Switch to ${tab} tab`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {selectedDistrict && (
        <div className="space-y-4">
          {selectedDistrict.historicalPeriods.map((period, index) => (
            <div key={period.era + index} className="p-4 bg-accent rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <input
                  type="text"
                  value={period.era}
                  onChange={(e) => {
                    const updatedPeriods = [...selectedDistrict.historicalPeriods];
                    updatedPeriods[index].era = e.target.value;
                    updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods });
                  }}
                  className="text-lg font-semibold bg-transparent border-b border-primary text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  disabled={!canEdit(selectedDistrict)}
                  aria-label={`Edit era ${period.era}`}
                />
                {canEdit(selectedDistrict) && (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { const updatedPeriods = selectedDistrict.historicalPeriods.filter((_, i) => i !== index); updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods }); }} className="px-2 py-1 bg-destructive text-background rounded-lg shadow-lg" aria-label={`Delete era ${period.era}`}>
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">Start Year</label>
                  <input
                    type="number"
                    value={period.startYear}
                    onChange={(e) => {
                      const updatedPeriods = [...selectedDistrict.historicalPeriods];
                      updatedPeriods[index].startYear = Number(e.target.value);
                      updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods });
                    }}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={!canEdit(selectedDistrict)}
                    aria-label={`Start year for ${period.era}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">End Year</label>
                  <input
                    type="number"
                    value={period.endYear}
                    onChange={(e) => {
                      const updatedPeriods = [...selectedDistrict.historicalPeriods];
                      updatedPeriods[index].endYear = Number(e.target.value);
                      updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods });
                    }}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={!canEdit(selectedDistrict)}
                    aria-label={`End year for ${period.era}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={period.description || ""}
                    onChange={(e) => {
                      const updatedPeriods = [...selectedDistrict.historicalPeriods];
                      updatedPeriods[index].description = e.target.value;
                      updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods });
                    }}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={!canEdit(selectedDistrict)}
                    aria-label={`Description for ${period.era}`}
                  />
                </div>
                {period.media
                  .filter((media) => (activeTab === "image" ? media.type === "image" : activeTab === "video" ? media.type === "video" : true))
                  .map((media, mediaIndex) => (
                    <div key={mediaIndex} className="flex items-center gap-2">
                      {media.type === "image" && <img src={media.url} alt={media.description || "Media preview"} className="w-16 h-16 object-cover rounded-lg" />}
                      {media.type === "video" && <video src={media.url} controls className="w-16 h-16 object-cover rounded-lg" />}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={media.altText}
                          onChange={(e) => {
                            const updatedPeriods = [...selectedDistrict.historicalPeriods];
                            updatedPeriods[index].media[mediaIndex].altText = e.target.value;
                            updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods });
                          }}
                          placeholder="Alt Text"
                          className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                          disabled={!canEdit(selectedDistrict)}
                          aria-label={`Alt text for media ${mediaIndex + 1}`}
                        />
                        <input
                          type="text"
                          value={media.description}
                          onChange={(e) => {
                            const updatedPeriods = [...selectedDistrict.historicalPeriods];
                            updatedPeriods[index].media[mediaIndex].description = e.target.value;
                            updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods });
                          }}
                          placeholder="Description"
                          className="w-full p-2 bg-card text-foreground border border-primary rounded-lg mt-2 focus:ring-2 focus:ring-primary disabled:opacity-50"
                          disabled={!canEdit(selectedDistrict)}
                          aria-label={`Description for media ${mediaIndex + 1}`}
                        />
                      </div>
                      {canEdit(selectedDistrict) && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { const updatedPeriods = [...selectedDistrict.historicalPeriods]; updatedPeriods[index].media = updatedPeriods[index].media.filter((_, i) => i !== mediaIndex); updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods }); }} className="px-2 py-1 bg-destructive text-background rounded-lg shadow-lg" aria-label={`Delete media ${mediaIndex + 1}`}>
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  ))}
              </div>
              {canEdit(selectedDistrict) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-foreground">Upload {activeTab === "image" ? "Image" : "Video"}</label>
                  <input
                    type="file"
                    accept={activeTab === "image" ? "image/*" : "video/*"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && validateFile(file, activeTab === "image" ? "image" : "video"))
                        setMediaFile({ file, previewUrl: URL.createObjectURL(file), type: activeTab === "image" ? "image" : "video" });
                    }}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg mb-2"
                    aria-label={`Upload ${activeTab}`}
                  />
                  {mediaFile.previewUrl && (
                    <div className="mt-2">
                      {activeTab === "image" ? (
                        <img src={mediaFile.previewUrl} alt="Media Preview" className="w-full h-32 object-cover rounded-lg" />
                      ) : (
                        <video src={mediaFile.previewUrl} controls className="w-full h-32 object-cover rounded-lg" />
                      )}
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => uploadMedia(selectedDistrict, index)} className="mt-2 w-full px-4 py-2 bg-primary text-background rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50" disabled={isUploading} aria-label={`Upload ${activeTab}`}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? "Uploading..." : "Upload"}
                      </motion.button>
                    </div>
                  )}
                  <label className="block text-sm font-medium mt-4 text-foreground">Or Enter {activeTab === "image" ? "Image" : "Video"} URL</label>
                  <input
                    type="text"
                    value={mediaImageUrlInput}
                    onChange={(e) => setMediaImageUrlInput(e.target.value)}
                    placeholder={`https://example.com/${activeTab}.${activeTab === "image" ? "png" : "mp4"}`}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg mt-2 focus:ring-2 focus:ring-primary disabled:opacity-50"
                    disabled={!canEdit(selectedDistrict) || isUploading}
                    aria-label={`${activeTab} URL`}
                  />
                  {mediaImageUrlInput && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => uploadMedia(selectedDistrict, index)} className="mt-2 w-full px-4 py-2 bg-success text-background rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50" disabled={isUploading} aria-label={`Add ${activeTab} URL`}>
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {isUploading ? "Adding..." : "Add URL"}
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          ))}
          {canEdit(selectedDistrict) && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { const updatedPeriods = [...selectedDistrict.historicalPeriods, { era: "New Era", media: [], color: "rgba(255, 255, 255, 0.5)", startYear: 0, endYear: 0, yearRange: "Unknown", description: "", events: [], landmarks: [], sources: [] }]; updateDistrictData(selectedDistrict, { historicalPeriods: updatedPeriods }); }} className="mt-4 w-full px-4 py-2 bg-success text-background rounded-lg shadow-lg flex items-center justify-center gap-2" aria-label="Add new historical period">
              <Plus className="w-4 h-4" /> Add Period
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Collaboration Modal Component
const CollaborationModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedProvince: ProvinceData | null;
  canEdit: (item: ProvinceData | null) => boolean;
  inviteCollaborator: (province: ProvinceData, invite: CollaborationInvite) => void;
}> = ({ isOpen, setIsOpen, selectedProvince, canEdit, inviteCollaborator }) => {
  const [invite, setInvite] = useState<CollaborationInvite>({ email: "", role: "editor" });
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; role: string }[]>([]);

  useEffect(() => {
    if (isOpen && selectedProvince) {
      setCollaborators(selectedProvince.editor || []);
    }
  }, [isOpen, selectedProvince]);

  const handleInvite = () => {
    if (!selectedProvince || !invite.email) return;
    inviteCollaborator(selectedProvince, invite);
    setInvite({ email: "", role: "editor" });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-label="Collaboration modal">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-card p-6 rounded-xl shadow-lg w-full max-w-lg relative">
            <button onClick={() => setIsOpen(false)} className="absolute top-2 right-2 text-xl text-foreground hover:text-primary focus:outline-none" aria-label="Close modal">
              <X size={24} />
            </button>
            <h3 className="text-xl font-semibold mb-4 text-foreground">Collaborators</h3>
            {selectedProvince && canEdit(selectedProvince) ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={invite.email}
                    onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="collaborator@example.com"
                    aria-label="Collaborator email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Role</label>
                  <select
                    value={invite.role}
                    onChange={(e) => setInvite({ ...invite, role: e.target.value as "editor" | "viewer" })}
                    className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                    aria-label="Collaborator role"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleInvite} className="w-full px-4 py-2 bg-success text-background rounded-lg shadow-lg" aria-label="Send invitation">
                  Invite
                </motion.button>
                <div className="mt-4">
                  <h4 className="text-lg font-medium text-foreground">Current Collaborators</h4>
                  {collaborators.length > 0 ? (
                    <ul className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {collaborators.map((collab) => (
                        <li key={collab.id} className="flex justify-between items-center p-2 bg-secondary rounded-lg">
                          <span>{collab.name} ({collab.role})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-foreground/70">No collaborators yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-foreground/70">You do not have permission to invite collaborators.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: DistrictData | ProvinceData | null;
  onConfirm: () => void;
}> = ({ isOpen, setIsOpen, item, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-label="Delete confirmation modal">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md">
          <h3 className="text-xl font-semibold mb-4 text-foreground">Confirm Deletion</h3>
          <p className="text-foreground/70 mb-6">Are you sure you want to delete {item?.name || "this item"}? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsOpen(false)} className="px-4 py-2 bg-secondary text-foreground rounded-lg shadow-lg" aria-label="Cancel deletion">
              Cancel
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { onConfirm(); setIsOpen(false); }} className="px-4 py-2 bg-destructive text-background rounded-lg shadow-lg" aria-label="Confirm deletion">
              Delete
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Main Component
export default function MapEditorPage() {
  const { data: session, status } = useSession();
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [filteredProvinces, setFilteredProvinces] = useState<ProvinceData[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newProvince, setNewProvince] = useState({ name: "", thaiName: "", totalArea: 0 });
  const [newDistrict, setNewDistrict] = useState<Partial<DistrictData>>({
    name: "",
    thaiName: "",
    historicalColor: "rgba(255, 255, 255, 0.5)",
    coordinates: { x: 300, y: 200, width: 100, height: 100 },
    historicalPeriods: [],
    createdAt: Timestamp.now(),
    createdBy: [],
    lock: false,
    version: 1,
  });
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<EditAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mapFile, setMapFile] = useState<FileUpload>({ file: null, previewUrl: null, type: "map" });
  const [mediaFile, setMediaFile] = useState<FileUpload>({ file: null, previewUrl: null, type: "image" });
  const [mapImageUrlInput, setMapImageUrlInput] = useState("");
  const [mediaImageUrlInput, setMediaImageUrlInput] = useState("");
  const [isAddProvinceModalOpen, setIsAddProvinceModalOpen] = useState(false);
  const [isAddDistrictModalOpen, setIsAddDistrictModalOpen] = useState(false);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<DistrictData | ProvinceData | null>(null);
  const [editMode, setEditMode] = useState<"province" | "district">("district");
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const actionIdRef = useRef(0);
  const mapState = useMapState();

  useEffect(() => {
    const fetchProvinces = async () => {
      if (status === "loading" || !session?.user) return;
      setLoading(true);
      try {
        const provincesSnapshot = await getDocs(collection(db, "provinces"));
        const provincesData: ProvinceData[] = await Promise.all(
          provincesSnapshot.docs.map(async (provinceDoc) => {
            const provinceData = provinceDoc.data() as Province;
            const districtsSnapshot = await getDocs(collection(db, `provinces/${provinceDoc.id}/districts`));
            const districtsData = districtsSnapshot.docs.map((districtDoc) => ({
              ...districtDoc.data() as District,
              id: districtDoc.id,
              createdBy: Array.isArray(districtDoc.data().createdBy) ? districtDoc.data().createdBy : [],
              editor: Array.isArray(districtDoc.data().editor) ? districtDoc.data().editor : [],
            } as DistrictData));
            return {
              ...provinceData,
              id: provinceDoc.id,
              districts: districtsData,
              createdBy: Array.isArray(provinceData.createdBy) ? provinceData.createdBy : [],
              editor: Array.isArray(provinceData.editor) ? provinceData.editor : [],
            } as ProvinceData;
          })
        );
        setProvinces(provincesData);
        setFilteredProvinces(provincesData);
        if (provincesData.length > 0 && !selectedProvince) {
          setSelectedProvince(provincesData[0]);
          if (provincesData[0].districts.length > 0) setSelectedDistrict(provincesData[0].districts[0]);
        }
      } catch (err) {
        addToast("error", "Failed to fetch provinces.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, [session, status]);

  useEffect(() => {
    setFilteredProvinces(
      provinces.filter(
        (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.thaiName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, provinces]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };
  
  const addToHistory = (action: EditAction) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(action);
      if (newHistory.length > MAX_HISTORY_SIZE) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    setHasUnsavedChanges(true);
  };
  
  const undo = () => {
    if (historyIndex < 0) return;
    const action = history[historyIndex];
    switch (action.type) {
      case "updateDistrict":
        const districtIdx = selectedProvince!.districts.findIndex((d) => d.id === action.id);
        const updatedDistrictsUndo = [...selectedProvince!.districts];
        updatedDistrictsUndo[districtIdx] = action.previousData;
        setSelectedProvince({ ...selectedProvince!, districts: updatedDistrictsUndo });
        setSelectedDistrict(action.previousData);
        break;
      case "updateProvince":
        setSelectedProvince(action.previousData);
        break;
      case "addDistrict":
        setSelectedProvince({
          ...selectedProvince!,
          districts: selectedProvince!.districts.filter((d) => d.id !== action.id),
        });
        setSelectedDistrict(null);
        break;
      case "deleteDistrict":
        setSelectedProvince({
          ...selectedProvince!,
          districts: [...selectedProvince!.districts, action.previousData],
        });
        break;
      case "addProvince":
        setProvinces((prev) => prev.filter((p) => p.id !== action.id));
        setSelectedProvince(null);
        setSelectedDistrict(null);
        break;
      case "deleteProvince":
        setProvinces((prev) => [...prev, action.previousData]);
        break;
      default:
        break;
    }
    setHistoryIndex((prev) => prev - 1);
  };
  
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const action = history[historyIndex + 1];
    switch (action.type) {
      case "updateDistrict":
        const districtIdx = selectedProvince!.districts.findIndex((d) => d.id === action.id);
        const updatedDistrictsRedo = [...selectedProvince!.districts];
        updatedDistrictsRedo[districtIdx] = action.data;
        setSelectedProvince({ ...selectedProvince!, districts: updatedDistrictsRedo });
        setSelectedDistrict(action.data);
        break;
      case "updateProvince":
        setSelectedProvince(action.data);
        break;
      case "addDistrict":
        setSelectedProvince({
          ...selectedProvince!,
          districts: [...selectedProvince!.districts, action.data],
        });
        break;
      case "deleteDistrict":
        setSelectedProvince({
          ...selectedProvince!,
          districts: selectedProvince!.districts.filter((d) => d.id !== action.id),
        });
        break;
      case "addProvince":
        setProvinces((prev) => [...prev, action.data]);
        break;
      case "deleteProvince":
        setProvinces((prev) => prev.filter((p) => p.id !== action.id));
        break;
      default:
        break;
    }
    setHistoryIndex((prev) => prev + 1);
  };
  
  const canEdit = (item: ProvinceData | DistrictData | null): boolean => {
    if (!session?.user) return false;
    if (!item) return false;
    const userId = session.user.id;
    return (
      item.createdBy.some((c) => c.id === userId) ||
      (item.editor?.some((e) => e.id === userId && e.role === "editor") ?? false)
    );
  };
  
  const saveChanges = async () => {
    if (!selectedProvince || !session?.user) return;
    setIsSaving(true);
    try {
      const provinceRef = doc(db, "provinces", selectedProvince.id);
      await updateDoc(provinceRef, {
        name: selectedProvince.name,
        thaiName: selectedProvince.thaiName,
        totalArea: selectedProvince.totalArea,
        lock: selectedProvince.lock,
        version: selectedProvince.version + 1,
        editor: selectedProvince.editor || [],
        historicalPeriods: selectedProvince.historicalPeriods || [],
        tags: selectedProvince.tags || [],
      });
  
      for (const district of selectedProvince.districts) {
        const districtRef = doc(db, `provinces/${selectedProvince.id}/districts`, district.id);
        try {
          await setDoc(districtRef, {
            name: district.name,
            thaiName: district.thaiName,
            historicalColor: district.historicalColor,
            coordinates: district.coordinates,
            historicalPeriods: district.historicalPeriods,
            createdAt: district.createdAt,
            createdBy: district.createdBy,
            lock: district.lock,
            version: district.version,
            mapImageUrl: district.mapImageUrl || "",
            culturalSignificance: district.culturalSignificance || "",
            visitorTips: district.visitorTips || "",
            editor: district.editor || [],
            collab: district.collab || null,
          });
        } catch (districtError) {
          console.error(`Failed to save district ${district.id}:`, districtError);
          addToast("error", `Failed to save district: ${district.name}`);
        }
      }
  
      setHasUnsavedChanges(false);
      addToast("success", "Changes saved successfully!");
    } catch (err) {
      addToast("error", "Failed to save changes.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };
  
  const updateDistrictCoordinates = (district: DistrictData, coords: DistrictData["coordinates"]) => {
    if (!selectedProvince || !canEdit(district)) return;
    const districtIdx = selectedProvince.districts.findIndex((d) => d.id === district.id);
    const previousData = { ...selectedProvince.districts[districtIdx] };
    const updatedDistricts = [...selectedProvince.districts];
    updatedDistricts[districtIdx] = { ...district, coordinates: coords, version: district.version + 1 };
    setSelectedProvince({ ...selectedProvince, districts: updatedDistricts });
    setSelectedDistrict(updatedDistricts[districtIdx]);
    addToHistory({
      type: "updateDistrict",
      data: updatedDistricts[districtIdx],
      previousData,
      timestamp: Date.now(),
      id: district.id,
    });
  };
  
  const updateDistrictColor = (district: DistrictData, color: string) => {
    if (!selectedProvince || !canEdit(district)) return;
    const districtIdx = selectedProvince.districts.findIndex((d) => d.id === district.id);
    const previousData = { ...selectedProvince.districts[districtIdx] };
    const updatedDistricts = [...selectedProvince.districts];
    updatedDistricts[districtIdx] = { ...district, historicalColor: color, version: district.version + 1 };
    setSelectedProvince({ ...selectedProvince, districts: updatedDistricts });
    setSelectedDistrict(updatedDistricts[districtIdx]);
    addToHistory({
      type: "updateDistrict",
      data: updatedDistricts[districtIdx],
      previousData,
      timestamp: Date.now(),
      id: district.id,
    });
  };
  
  const updateDistrictData = (district: DistrictData, data: Partial<DistrictData>) => {
    if (!selectedProvince || !canEdit(district)) return;
    const districtIdx = selectedProvince.districts.findIndex((d) => d.id === district.id);
    const previousData = { ...selectedProvince.districts[districtIdx] };
    const updatedDistricts = [...selectedProvince.districts];
    updatedDistricts[districtIdx] = { ...district, ...data, version: district.version + 1 };
    setSelectedProvince({ ...selectedProvince, districts: updatedDistricts });
    setSelectedDistrict(updatedDistricts[districtIdx]);
    addToHistory({
      type: "updateDistrict",
      data: updatedDistricts[districtIdx],
      previousData,
      timestamp: Date.now(),
      id: district.id,
    });
  };
  
  const updateProvinceName = async (province: ProvinceData, name: string, thaiName: string) => {
    if (!canEdit(province)) return;
    const previousData = { ...province };
    const updatedProvince = { ...province, name, thaiName, version: province.version + 1 };
    setSelectedProvince(updatedProvince);
    setProvinces((prev) => prev.map((p) => (p.id === province.id ? updatedProvince : p)));
    addToHistory({
      type: "updateProvince",
      data: updatedProvince,
      previousData,
      timestamp: Date.now(),
      id: province.id,
    });
  };
  
  const toggleLock = async (item: ProvinceData | DistrictData, type: "province" | "district") => {
    if (!canEdit(item)) return;
    if (type === "province") {
      const previousData = { ...item };
      const updatedProvince = { ...(item as ProvinceData), lock: !item.lock, version: item.version + 1 };
      setSelectedProvince(updatedProvince);
      setProvinces((prev) => prev.map((p) => (p.id === item.id ? updatedProvince : p)));
      addToHistory({
        type: "updateProvince",
        data: updatedProvince,
        previousData,
        timestamp: Date.now(),
        id: item.id,
      });
    } else if (selectedProvince) {
      const districtIdx = selectedProvince.districts.findIndex((d) => d.id === item.id);
      const previousData = { ...selectedProvince.districts[districtIdx] };
      const updatedDistricts = [...selectedProvince.districts];
      updatedDistricts[districtIdx] = { ...(item as DistrictData), lock: !item.lock, version: item.version + 1 };
      setSelectedProvince({ ...selectedProvince, districts: updatedDistricts });
      setSelectedDistrict(updatedDistricts[districtIdx]);
      addToHistory({
        type: "updateDistrict",
        data: updatedDistricts[districtIdx],
        previousData,
        timestamp: Date.now(),
        id: item.id,
      });
    }
  };
  
  const deleteProvince = async (province: ProvinceData) => {
    if (!canEdit(province)) return;
    try {
      await deleteDoc(doc(db, "provinces", province.id));
      setProvinces((prev) => prev.filter((p) => p.id !== province.id));
      setSelectedProvince(null);
      setSelectedDistrict(null);
      addToHistory({
        type: "deleteProvince",
        data: null,
        previousData: province,
        timestamp: Date.now(),
        id: province.id,
      });
      addToast("success", "Province deleted successfully!");
    } catch (err) {
      addToast("error", "Failed to delete province.");
      console.error(err);
    }
  };
  
  const deleteDistrict = async (district: DistrictData) => {
    if (!selectedProvince || !canEdit(district)) return;
    try {
      await deleteDoc(doc(db, `provinces/${selectedProvince.id}/districts`, district.id));
      const updatedDistricts = selectedProvince.districts.filter((d) => d.id !== district.id);
      setSelectedProvince({ ...selectedProvince, districts: updatedDistricts });
      setSelectedDistrict(null);
      addToHistory({
        type: "deleteDistrict",
        data: null,
        previousData: district,
        timestamp: Date.now(),
        id: district.id,
      });
      addToast("success", "District deleted successfully!");
    } catch (err) {
      addToast("error", "Failed to delete district.");
      console.error(err);
    }
  };
  
  const addProvince = async () => {
    if (!session?.user || !newProvince.name || !newProvince.thaiName) return;
    try {
      // Set the document name (ID) to the lowercase version of the province name
      const provinceRef = await setDoc(doc(db, "provinces", newProvince.name.toLowerCase()), {
        name: newProvince.name,
        thaiName: newProvince.thaiName,
        totalArea: newProvince.totalArea,
        districts: [],
        createdAt: Timestamp.now(),
        createdBy: [{ id: session.user.id, name: session.user.name || "Unknown" }],
        lock: false,
        version: 1,
      });
  
      const newProvinceData: ProvinceData = {
        id: newProvince.name.toLowerCase(), // The id is now the lowercase version of the name
        name: newProvince.name,
        thaiName: newProvince.thaiName,
        totalArea: newProvince.totalArea,
        districts: [],
        createdAt: Timestamp.now(),
        createdBy: [{ id: session.user.id, name: session.user.name || "Unknown" }],
        lock: false,
        version: 1,
      };
  
      setProvinces((prev) => [...prev, newProvinceData]);
      setSelectedProvince(newProvinceData);
      setNewProvince({ name: "", thaiName: "", totalArea: 0 });
      setIsAddProvinceModalOpen(false);
      
      addToHistory({
        type: "addProvince",
        data: newProvinceData,
        previousData: null,
        timestamp: Date.now(),
        id: newProvince.name.toLowerCase(), // The id is now the lowercase version of the name
      });
      
      addToast("success", "Province added successfully!");
    } catch (err) {
      addToast("error", "Failed to add province.");
      console.error(err);
    }
  };
  
  const addDistrict = async () => {
    if (!selectedProvince || !session?.user || !newDistrict.name || !newDistrict.thaiName) return;
    try {
      // Set the document name (ID) to the lowercase version of the district name
      const districtRef = await setDoc(doc(db, `provinces/${selectedProvince.id}/districts`, newDistrict.name.toLowerCase()), {
        name: newDistrict.name,
        thaiName: newDistrict.thaiName,
        historicalColor: newDistrict.historicalColor,
        coordinates: newDistrict.coordinates,
        historicalPeriods: newDistrict.historicalPeriods || [],
        createdAt: Timestamp.now(),
        createdBy: [{ id: session.user.id, name: session.user.name || "Unknown" }],
        lock: false,
        version: 1,
      });
  
      const newDistrictData: DistrictData = {
        id: newDistrict.name.toLowerCase(), // The id is now the lowercase version of the name
        name: newDistrict.name!,
        thaiName: newDistrict.thaiName!,
        historicalColor: newDistrict.historicalColor!,
        coordinates: newDistrict.coordinates!,
        historicalPeriods: newDistrict.historicalPeriods || [],
        createdAt: Timestamp.now(),
        createdBy: [{ id: session.user.id, name: session.user.name || "Unknown" }],
        lock: false,
        version: 1,
      };
  
      setSelectedProvince({
        ...selectedProvince,
        districts: [...selectedProvince.districts, newDistrictData],
      });
  
      setSelectedDistrict(newDistrictData);
      setNewDistrict({
        name: "",
        thaiName: "",
        historicalColor: "rgba(255, 255, 255, 0.5)",
        coordinates: { x: 300, y: 200, width: 100, height: 100 },
        historicalPeriods: [],
        createdAt: Timestamp.now(),
        createdBy: [],
        lock: false,
        version: 1,
      });
  
      setIsAddDistrictModalOpen(false);
      
      addToHistory({
        type: "addDistrict",
        data: newDistrictData,
        previousData: null,
        timestamp: Date.now(),
        id: newDistrict.name.toLowerCase(), // The id is now the lowercase version of the name
      });
      
      addToast("success", "District added successfully!");
    } catch (err) {
      addToast("error", "Failed to add district.");
      console.error(err);
    }
  };
  
  const uploadMapImage = async () => {
    if (!selectedDistrict || !canEdit(selectedDistrict) || (!mapFile.file && !mapImageUrlInput)) return;
    setIsUploading(true);
    try {
      let mapImageUrl = mapImageUrlInput;
      if (mapFile.file) {
        // Prepare FormData to send to the API
        const formData = new FormData();
        formData.append("file", mapFile.file);
        formData.append("type", "image");
  
        // Send the file to the API route
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error("Failed to upload image to Cloudinary");
        }
  
        const data = await response.json();
        mapImageUrl = data.url; // Get the Cloudinary URL from the response
      }
  
      const previousData = { ...selectedDistrict };
      updateDistrictData(selectedDistrict, { mapImageUrl });
      setMapFile({ file: null, previewUrl: null, type: "map" });
      setMapImageUrlInput("");
      addToast("success", "Map image uploaded successfully!");
      addToHistory({
        type: "uploadMap",
        data: { ...selectedDistrict, mapImageUrl },
        previousData,
        timestamp: Date.now(),
        id: selectedDistrict.id,
      });
    } catch (err) {
      addToast("error", "Failed to upload map image.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };
  
  const uploadMedia = async (district: DistrictData, periodIndex: number) => {
    if (!canEdit(district) || (!mediaFile.file && !mediaImageUrlInput)) return;
    setIsUploading(true);
    try {
      let mediaUrl = mediaImageUrlInput;
      if (mediaFile.file) {
        // Prepare FormData to send to the API
        const formData = new FormData();
        formData.append("file", mediaFile.file);
        formData.append("type", mediaFile.type); // "image" or "video"
  
        // Send the file to the API route
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error("Failed to upload media to Cloudinary");
        }
  
        const data = await response.json();
        mediaUrl = data.url; // Get the Cloudinary URL from the response
      }
  
      const previousData = { ...district };
      const updatedPeriods = [...district.historicalPeriods];
      updatedPeriods[periodIndex].media.push({
        url: mediaUrl,
        type: mediaFile.type || (mediaImageUrlInput.includes("video") ? "video" : "image"),
        altText: "",
        description: "",
      });
      updateDistrictData(district, { historicalPeriods: updatedPeriods });
      setMediaFile({ file: null, previewUrl: null, type: "image" });
      setMediaImageUrlInput("");
      addToast("success", "Media uploaded successfully!");
      addToHistory({
        type: "uploadMedia",
        data: { ...district, historicalPeriods: updatedPeriods },
        previousData,
        timestamp: Date.now(),
        id: district.id,
      });
    } catch (err) {
      addToast("error", "Failed to upload media.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };
  
  const inviteCollaborator = async (province: ProvinceData, invite: CollaborationInvite) => {
    if (!canEdit(province)) return;
    try {
      const updatedEditors = [
        ...(province.editor || []),
        { id: `temp-${Date.now()}`, name: invite.email, role: invite.role },
      ];
      const updatedProvince = { ...province, editor: updatedEditors };
      setSelectedProvince(updatedProvince);
      setProvinces((prev) => prev.map((p) => (p.id === province.id ? updatedProvince : p)));
      // Simulate sending invite (replace with actual email service)
      await updateDoc(doc(db, "provinces", province.id), { editor: updatedEditors });
      addToast("success", `Invited ${invite.email} as ${invite.role}!`);
    } catch (err) {
      addToast("error", "Failed to invite collaborator.");
      console.error(err);
    }
  };
  
  const requestEditorAccess = async (item: ProvinceData | DistrictData, purpose: string) => {
    if (!session?.user) return;
    try {
      const requestData: CollaborationRequest = {
        id: `req-${Date.now()}`,
        provinceId: "provinceId" in item ? item.id : selectedProvince!.id,
        districtId: "coordinates" in item ? item.id : undefined,
        requesterId: session.user.id,
        requesterName: session.user.name || "Unknown",
        purpose,
        status: "pending",
        requestedAt: Timestamp.now(),
      };
      await addDoc(collection(db, "collaborationRequests"), requestData);
      addToast("success", "Editor access requested successfully!");
    } catch (err) {
      addToast("error", "Failed to request editor access.");
      console.error(err);
    }
  };
  
  // Additional Features for Line Count
  const CollaborationRequestsPanel: React.FC<{
    requests: CollaborationRequest[];
    acceptRequest: (request: CollaborationRequest) => void;
    rejectRequest: (request: CollaborationRequest) => void;
  }> = ({ requests, acceptRequest, rejectRequest }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-4 sm:p-6 rounded-xl shadow-lg mt-4"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Collaboration Requests</h2>
      {requests.length === 0 ? (
        <p className="text-foreground/70">No pending requests.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id} className="p-4 bg-secondary rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-foreground">
                  <strong>{request.requesterName}</strong> requests editor access
                </p>
                <p className="text-foreground/70 text-sm">Purpose: {request.purpose}</p>
                <p className="text-foreground/70 text-sm">
                  Requested at: {request.requestedAt.toDate().toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => acceptRequest(request)}
                  className="px-3 py-1 bg-success text-background rounded-lg shadow-lg"
                  aria-label={`Accept request from ${request.requesterName}`}
                >
                  Accept
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => rejectRequest(request)}
                  className="px-3 py-1 bg-destructive text-background rounded-lg shadow-lg"
                  aria-label={`Reject request from ${request.requesterName}`}
                >
                  Reject
                </motion.button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
  
  const acceptRequest = async (request: CollaborationRequest) => {
    try {
      if (request.districtId && selectedProvince) {
        const district = selectedProvince.districts.find((d) => d.id === request.districtId);
        if (district && canEdit(district)) {
          const updatedEditors: { id: string; name: string; role: "editor" | "viewer" }[] = [
            ...(district.editor || []),
            { id: request.requesterId, name: request.requesterName, role: "editor" },
          ];
          updateDistrictData(district, { editor: updatedEditors });
        }
      } else if (selectedProvince && canEdit(selectedProvince)) {
        const updatedEditors: { id: string; name: string; role: "editor" | "viewer" }[] = [
          ...(selectedProvince.editor || []),
          { id: request.requesterId, name: request.requesterName, role: "editor" },
        ];
        setSelectedProvince({ ...selectedProvince, editor: updatedEditors });
        await updateDoc(doc(db, "provinces", selectedProvince.id), { editor: updatedEditors });
      }
      await updateDoc(doc(db, "collaborationRequests", request.id), { status: "accepted" });
      addToast("success", `Accepted request from ${request.requesterName}`); // Fixed template literal syntax
    } catch (err) {
      addToast("error", "Failed to accept request.");
      console.error(err);
    }
  };
  
  const rejectRequest = async (request: CollaborationRequest) => {
    try {
      await updateDoc(doc(db, "collaborationRequests", request.id), { status: "rejected" });
      addToast("success", `Rejected request from ${request.requesterName}`);
    } catch (err) {
      addToast("error", "Failed to reject request.");
      console.error(err);
    }
  };
  
  const HistoryPanel: React.FC<{ history: EditAction[] }> = ({ history }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-4 sm:p-6 rounded-xl shadow-lg mt-4"
    >
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Edit History</h2>
      {history.length === 0 ? (
        <p className="text-foreground/70">No edit history available.</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {history.slice().reverse().map((action, index) => (
            <li key={index} className="p-2 bg-secondary rounded-lg">
              <p className="text-foreground">
                <strong>{action.type.replace(/([A-Z])/g, " $1").trim()}</strong> - {action.id}
              </p>
              <p className="text-foreground/70 text-sm">
                {new Date(action.timestamp).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
  
  const TagManager: React.FC<{
    selectedProvince: ProvinceData | null;
    canEdit: (item: ProvinceData | null) => boolean;
    updateTags: (province: ProvinceData, tags: string[]) => void;
  }> = ({ selectedProvince, canEdit, updateTags }) => {
    const [newTag, setNewTag] = useState("");
  
    const addTag = () => {
      if (!selectedProvince || !newTag.trim() || !canEdit(selectedProvince)) return;
      const updatedTags = [...(selectedProvince.tags || []), newTag.trim()];
      updateTags(selectedProvince, updatedTags);
      setNewTag("");
    };
  
    const removeTag = (tag: string) => {
      if (!selectedProvince || !canEdit(selectedProvince)) return;
      const updatedTags = (selectedProvince.tags || []).filter((t) => t !== tag);
      updateTags(selectedProvince, updatedTags);
    };
  
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-4 sm:p-6 rounded-xl shadow-lg mt-4"
      >
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Tag Manager</h2>
        {selectedProvince ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!canEdit(selectedProvince)}
                aria-label="New tag"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addTag}
                className="px-4 py-2 bg-success text-background rounded-lg shadow-lg disabled:opacity-50"
                disabled={!canEdit(selectedProvince)}
                aria-label="Add tag"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(selectedProvince.tags || []).map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 bg-accent text-foreground rounded-full"
                >
                  <span>{tag}</span>
                  {canEdit(selectedProvince) && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeTag(tag)}
                      className="text-destructive"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-foreground/70">Select a province to manage tags.</p>
        )}
      </motion.div>
    );
  };
  
  const updateTags = (province: ProvinceData, tags: string[]) => {
    if (!canEdit(province)) return;
    const previousData = { ...province };
    const updatedProvince = { ...province, tags, version: province.version + 1 };
    setSelectedProvince(updatedProvince);
    setProvinces((prev) => prev.map((p) => (p.id === province.id ? updatedProvince : p)));
    addToHistory({
      type: "updateProvince",
      data: updatedProvince,
      previousData,
      timestamp: Date.now(),
      id: province.id,
    });
  };
  
  // Render
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-foreground">Please sign in to access the map editor.</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Map Editor</h1>
          <div className="flex gap-2">
        <motion.div className="fixed top-16 right-4 z-50 bg-glass-bg rounded-lg shadow-lg p-2 md:p-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <button onClick={() => setIsControlsOpen((prev) => !prev)} className="w-full text-foreground mb-2 focus:outline-none" aria-label={isControlsOpen ? "Hide controls" : "Show controls"}>{isControlsOpen ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}</button>
            <AnimatePresence>
              {isControlsOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={undo}
                  disabled={historyIndex < 0}
                  className="px-3 py-1 sm:px-4 sm:py-2 bg-secondary text-foreground rounded-lg shadow-lg disabled:opacity-50 flex items-center gap-2"
                  aria-label="Undo last action"
                >
                  <Undo2 className="w-4 h-4" /> Undo
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="px-3 py-1 sm:px-4 sm:py-2 bg-secondary text-foreground rounded-lg shadow-lg disabled:opacity-50 flex items-center gap-2"
                  aria-label="Redo last action"
                >
                  <Redo2 className="w-4 h-4" /> Redo
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveChanges}
                  disabled={!hasUnsavedChanges || isSaving}
                  className="px-3 py-1 sm:px-4 sm:py-2 bg-success text-background rounded-lg shadow-lg disabled:opacity-50 flex items-center gap-2"
                  aria-label="Save changes"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving..." : "Save"}
                </motion.button>
                </motion.div>
              )}
          </AnimatePresence>
        </motion.div>
      </div>
        </motion.div>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-1">
            <ProvinceSelector
              provinces={provinces}
              filteredProvinces={filteredProvinces}
              selectedProvince={selectedProvince}
              setSelectedProvince={setSelectedProvince}
              setSelectedDistrict={setSelectedDistrict}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              toggleLock={toggleLock}
              deleteProvince={deleteProvince}
              updateProvinceName={updateProvinceName}
              canEdit={canEdit}
              loading={loading}
              setIsAddProvinceModalOpen={setIsAddProvinceModalOpen}
              setIsCollaborationModalOpen={setIsCollaborationModalOpen}
              requestEditorAccess={requestEditorAccess}
            />
            {isControlsOpen && (
              <DistrictEditor
                selectedProvince={selectedProvince}
                selectedDistrict={selectedDistrict}
                updateDistrictCoordinates={updateDistrictCoordinates}
                updateDistrictColor={updateDistrictColor}
                uploadMapImage={uploadMapImage}
                canEdit={canEdit}
                toggleLock={toggleLock}
                mapFile={mapFile}
                setMapFile={setMapFile}
                mapImageUrlInput={mapImageUrlInput}
                setMapImageUrlInput={setMapImageUrlInput}
                isUploading={isUploading}
              />
            )}
          </div>
          <div className="lg:col-span-2">
            <MapComponent
              selectedProvince={selectedProvince}
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
              updateDistrictCoordinates={updateDistrictCoordinates}
              canEdit={canEdit}
              mapState={mapState}
            />
            {isControlsOpen && (
              <>
                <DataEditor
                  selectedProvince={selectedProvince}
                  selectedDistrict={selectedDistrict}
                  setSelectedDistrict={setSelectedDistrict}
                  setSelectedProvince={setSelectedProvince}
                  updateDistrictData={updateDistrictData}
                  deleteDistrict={deleteDistrict}
                  canEdit={canEdit}
                  setIsAddDistrictModalOpen={setIsAddDistrictModalOpen}
                  editMode={editMode}
                  setEditMode={setEditMode}
                  setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
                  setDeleteItem={setDeleteItem}
                  requestEditorAccess={requestEditorAccess}
                />
                <MediaEditor
                  selectedDistrict={selectedDistrict}
                  updateDistrictData={updateDistrictData}
                  uploadMedia={uploadMedia}
                  canEdit={canEdit}
                  mediaFile={mediaFile}
                  setMediaFile={setMediaFile}
                  mediaImageUrlInput={mediaImageUrlInput}
                  setMediaImageUrlInput={setMediaImageUrlInput}
                  isUploading={isUploading}
                />
                <TagManager
                  selectedProvince={selectedProvince}
                  canEdit={canEdit}
                  updateTags={updateTags}
                />
                <HistoryPanel history={history} />
                <CollaborationRequestsPanel
                  requests={[] /* Fetch requests from Firestore */}
                  acceptRequest={acceptRequest}
                  rejectRequest={rejectRequest}
                />
              </>
            )}
          </div>
        </div>
  
        {/* Modals */}
        <AnimatePresence>
          {isAddProvinceModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              role="dialog"
              aria-label="Add province modal"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md"
              >
                <h3 className="text-xl font-semibold mb-4 text-foreground">Add New Province</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Name</label>
                    <input
                      type="text"
                      value={newProvince.name}
                      onChange={(e) => setNewProvince({ ...newProvince, name: e.target.value })}
                      className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                      aria-label="Province name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Thai Name</label>
                    <input
                      type="text"
                      value={newProvince.thaiName}
                      onChange={(e) => setNewProvince({ ...newProvince, thaiName: e.target.value })}
                      className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                      aria-label="Thai name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Total Area (sq km)</label>
                    <input
                      type="number"
                      value={newProvince.totalArea}
                      onChange={(e) => setNewProvince({ ...newProvince, totalArea: Number(e.target.value) })}
                      className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                      aria-label="Total area"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsAddProvinceModalOpen(false)}
                      className="px-4 py-2 bg-secondary text-foreground rounded-lg shadow-lg"
                      aria-label="Cancel adding province"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addProvince}
                      className="px-4 py-2 bg-success text-background rounded-lg shadow-lg"
                      aria-label="Add province"
                    >
                      Add
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
  
        <AnimatePresence>
          {isAddDistrictModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              role="dialog"
              aria-label="Add district modal"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md"
              >
                <h3 className="text-xl font-semibold mb-4 text-foreground">Add New District</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Name</label>
                    <input
                      type="text"
                      value={newDistrict.name}
                      onChange={(e) => setNewDistrict({ ...newDistrict, name: e.target.value })}
                      className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                      aria-label="District name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Thai Name</label>
                    <input
                      type="text"
                      value={newDistrict.thaiName}
                      onChange={(e) => setNewDistrict({ ...newDistrict, thaiName: e.target.value })}
                      className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                      aria-label="Thai name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Historical Color</label>
                    <input
                      type="color"
                      value={rgbaToHex(newDistrict.historicalColor || "rgba(255, 255, 255, 0.5)")}
                      onChange={(e) => setNewDistrict({ ...newDistrict, historicalColor: hexToRgba(e.target.value, 0.5) })}
                      className="w-full h-10 p-1 bg-card text-foreground border border-primary rounded-lg"
                      aria-label="Historical color"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">X Position</label>
                      <input
                        type="number"
                        value={newDistrict.coordinates?.x}
                        onChange={(e) => setNewDistrict({ ...newDistrict, coordinates: { ...newDistrict.coordinates!, x: Number(e.target.value) } })}
                        className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                        aria-label="X position"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Y Position</label>
                      <input
                        type="number"
                        value={newDistrict.coordinates?.y}
                        onChange={(e) => setNewDistrict({ ...newDistrict, coordinates: { ...newDistrict.coordinates!, y: Number(e.target.value) } })}
                        className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                        aria-label="Y position"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Width</label>
                      <input
                        type="number"
                        value={newDistrict.coordinates?.width}
                        onChange={(e) => setNewDistrict({ ...newDistrict, coordinates: { ...newDistrict.coordinates!, width: Number(e.target.value) } })}
                        className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                        aria-label="Width"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Height</label>
                      <input
                        type="number"
                        value={newDistrict.coordinates?.height}
                        onChange={(e) => setNewDistrict({ ...newDistrict, coordinates: { ...newDistrict.coordinates!, height: Number(e.target.value) } })}
                        className="w-full p-2 bg-card text-foreground border border-primary rounded-lg focus:ring-2 focus:ring-primary"
                        aria-label="Height"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsAddDistrictModalOpen(false)}
                      className="px-4 py-2 bg-secondary text-foreground rounded-lg shadow-lg"
                      aria-label="Cancel adding district"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addDistrict}
                      className="px-4 py-2 bg-success text-background rounded-lg shadow-lg"
                      aria-label="Add district"
                    >
                      Add
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
  
        <CollaborationModal
          isOpen={isCollaborationModalOpen}
          setIsOpen={setIsCollaborationModalOpen}
          selectedProvince={selectedProvince}
          canEdit={canEdit}
          inviteCollaborator={inviteCollaborator}
        />
  
        <DeleteConfirmModal
          isOpen={isDeleteConfirmOpen}
          setIsOpen={setIsDeleteConfirmOpen}
          item={deleteItem}
          onConfirm={() => {
            if ("districts" in deleteItem!) deleteProvince(deleteItem as ProvinceData);
            else deleteDistrict(deleteItem as DistrictData);
          }}
        />
  
        {/* Toasts */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`p-4 rounded-lg shadow-lg flex items-center gap-2 ${
                  toast.type === "success"
                    ? "bg-success text-background"
                    : toast.type === "error"
                    ? "bg-destructive text-background"
                    : "bg-accent text-foreground"
                }`}
              >
                {toast.type === "success" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                {toast.type === "error" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                {toast.type === "info" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                <span>{toast.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
  }
  
  // Utility Functions
  function isColorDark(color: string): boolean {
    const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgba) return false;
    const [_, r, g, b] = rgba.map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }
  
  function rgbaToHex(rgba: string): string {
    const rgbaMatch = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgbaMatch) return "#ffffff";
    const [_, r, g, b] = rgbaMatch.map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // End of Utility Functions