"use client";

import { District, HistoricalPeriod } from "@/lib/districts";
import { Province } from "@/lib/provinces";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { BookOpen, ChevronDown, ChevronUp, Map as MapIcon } from "lucide-react";

interface DistrictInfoProps {
  districts: District[];
  period: HistoricalPeriod;
  provinceName?: string;
  provinceData?: Province | null;
}

export default function DistrictInfo({
  districts,
  period,
  provinceName = "",
  provinceData,
}: DistrictInfoProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "events" | "landmarks" | "media" | "geography" | "relation"
  >("overview");
  const [isCollabMode, setIsCollabMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const hasCollab = districts.length === 1 && districts[0].collab?.isActive;
  const collabData = districts[0]?.collab;
  const isAllDistrictsSelected =
    districts.length === provinceData?.districts.length && districts.length > 0;

  const tabs = useMemo(() => {
    if (isAllDistrictsSelected) {
      return [
        { id: "overview", name: "Province Overview" },
        { id: "events", name: "Events", count: period.events.length },
        { id: "landmarks", name: "Landmarks", count: period.landmarks.length },
        { id: "media", name: "Gallery", count: period.media.length },
        { id: "geography", name: "Geography" },
      ].filter((tab) => tab.id === "overview" || tab.count === undefined || tab.count > 0);
    }
    if (districts.length > 1) {
      return [{ id: "relation", name: "Relation Summary" }];
    }
    return [
      { id: "overview", name: "Overview" },
      { id: "events", name: "Events", count: period.events.length },
      { id: "landmarks", name: "Landmarks", count: period.landmarks.length },
      { id: "media", name: "Gallery", count: period.media.length },
      { id: "geography", name: "Geography" },
    ].filter((tab) => tab.id === "overview" || tab.count === undefined || tab.count > 0);
  }, [districts.length, period, isAllDistrictsSelected]);

  const title = isAllDistrictsSelected
    ? `${provinceName} Province`
    : districts.length === 1
    ? `${districts[0].name} (${districts[0].thaiName})`
    : `${districts.length} Districts Selected`;

  const toggleCollab = useCallback(() => setIsCollabMode((prev) => !prev), []);
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
      role="region"
      aria-label="District Information"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 mb-6">
        <motion.div className="flex items-center gap-3 sm:gap-4">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-glass-border shadow-md flex-shrink-0"
            style={{ backgroundColor: period.color }}
          />
          <div>
            <span className="text-xs sm:text-sm font-thai text-secondary tracking-wide">
              {period.era}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-thai font-bold text-primary">
              {title}
            </h2>
          </div>
        </motion.div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <nav
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-glass-bg"
            role="tablist"
          >
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-glass-bg text-foreground/80 hover:bg-primary/10"
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
              >
                {tab.name} {tab.count ? `(${tab.count})` : ""}
              </motion.button>
            ))}
          </nav>
          {hasCollab && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleCollab}
              className="self-end flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20 transition-colors duration-200"
              aria-label={isCollabMode ? "Switch to Original View" : "Switch to Story Mode"}
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm font-medium">
                {isCollabMode ? "Original View" : "Story Mode"}
              </span>
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${isCollabMode}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
        >
          {activeTab === "overview" && (
            <div className="space-y-4">
              <motion.p
                className="text-foreground/90 text-sm sm:text-base leading-relaxed bg-glass-bg p-4 sm:p-6 rounded-lg border border-glass-border shadow-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {isCollabMode && collabData
                  ? collabData.storylineSnippet
                  : isAllDistrictsSelected
                  ? `During the ${period.era} era, ${provinceName} experienced significant developments across its districts.`
                  : districts.length === 1
                  ? period.description
                  : "Select a single district for detailed information."}
              </motion.p>
              {districts.length === 1 && !isCollabMode && (
                <>
                  <CollapsibleSection
                    title="Cultural Significance"
                    content={districts[0].culturalSignificance || "No data available."}
                    isExpanded={expandedSections["cultural"]}
                    onToggle={() => toggleSection("cultural")}
                  />
                  <CollapsibleSection
                    title="Visitor Tips"
                    content={districts[0].visitorTips || "No tips available."}
                    isExpanded={expandedSections["tips"]}
                    onToggle={() => toggleSection("tips")}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === "events" && period.events.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {(isCollabMode && collabData?.characters ? collabData.characters : period.events).map(
                (item, index) => (
                  <EventCard key={index} index={index} content={typeof item === "string" ? item : item.name} />
                )
              )}
            </div>
          )}

          {activeTab === "landmarks" && period.landmarks.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {(isCollabMode && collabData?.relatedLandmarks
                ? collabData.relatedLandmarks
                : period.landmarks
              ).map((landmark, index) => (
                <EventCard key={index} index={index} content={landmark} />
              ))}
            </div>
          )}

          {activeTab === "media" && period.media.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(isCollabMode && collabData?.media?.length ? collabData.media : period.media).map(
                (item, index) => (
                  <MediaCard key={index} item={item} index={index} />
                )
              )}
            </div>
          )}

          {activeTab === "geography" && (
            <div className="space-y-4">
              {isAllDistrictsSelected ? (
                <CollapsibleSection
                  title="Province Geography"
                  content={`Total Area: ${provinceData?.totalArea} sq.km`}
                  isExpanded={expandedSections["geography"]}
                  onToggle={() => toggleSection("geography")}
                />
              ) : districts.length === 1 ? (
                <>
                  <CollapsibleSection
                    title="Area Size"
                    content={`${districts[0].areaSize || "N/A"} sq.km`}
                    isExpanded={expandedSections["area"]}
                    onToggle={() => toggleSection("area")}
                  />
                  <CollapsibleSection
                    title="Climate"
                    content={districts[0].climate || "N/A"}
                    isExpanded={expandedSections["climate"]}
                    onToggle={() => toggleSection("climate")}
                  />
                  <CollapsibleSection
                    title="Population"
                    content={`${districts[0].population || "N/A"}`}
                    isExpanded={expandedSections["population"]}
                    onToggle={() => toggleSection("population")}
                  />
                  {districts[0].googleMapsUrl && (
                    <a
                      href={districts[0].googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <MapIcon className="w-4 h-4" />
                      View on Google Maps
                    </a>
                  )}
                </>
              ) : (
                <p className="text-foreground/70">Select a single district for geography details.</p>
              )}
            </div>
          )}

          {activeTab === "relation" && districts.length > 1 && (
            <div className="space-y-4">
              <CollapsibleSection
                title="Summary"
                content={`Selected ${districts.length} districts in ${provinceName}. Total population: ${districts.reduce(
                  (sum, d) => sum + (d.population || 0),
                  0
                )}, Total area: ${districts.reduce((sum, d) => sum + (d.areaSize || 0), 0)} sq.km`}
                isExpanded={expandedSections["relation"]}
                onToggle={() => toggleSection("relation")}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

const CollapsibleSection = ({
  title,
  content,
  isExpanded,
  onToggle,
}: {
  title: string;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}) => (
  <motion.div className="bg-glass-bg rounded-lg border border-glass-border shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex justify-between items-center text-left"
      aria-expanded={isExpanded}
      aria-controls={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <h4 className="text-lg font-thai font-semibold text-primary">{title}</h4>
      {isExpanded ? (
        <ChevronUp className="w-5 h-5 text-foreground/80" />
      ) : (
        <ChevronDown className="w-5 h-5 text-foreground/80" />
      )}
    </button>
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="px-4 pb-4"
          id={`section-${title.toLowerCase().replace(/\s/g, "-")}`}
        >
          <p className="text-foreground/80 text-sm sm:text-base">{content}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const EventCard = ({ index, content }: { index: number; content: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="bg-glass-bg p-4 sm:p-5 rounded-lg border border-glass-border shadow-sm flex items-start gap-3"
  >
    <span className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base">
      {index + 1}
    </span>
    <p className="text-foreground/90 text-sm sm:text-base flex-1">{content}</p>
  </motion.div>
);

const MediaCard = ({
  item,
  index,
}: {
  item: { type: string; url: string; description?: string };
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ scale: 1.02 }}
    className="rounded-lg overflow-hidden border border-glass-border shadow-md"
  >
    <div className="relative aspect-video bg-glass-bg">
      {item.type === "image" ? (
        <img
          src={item.url}
          alt={item.description || "Media content"}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
      ) : (
        <iframe
          src={item.url}
          title={item.description || "Media content"}
          className="w-full h-full"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-3 sm:p-4">
        <p className="text-white text-xs sm:text-sm">{item.description || "No description."}</p>
      </div>
    </div>
  </motion.div>
);