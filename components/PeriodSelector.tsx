import { HistoricalPeriod } from "@/lib/districts";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface PeriodSelectorProps {
  periods: HistoricalPeriod[];
  selectedPeriod: HistoricalPeriod | null;
  onSelectPeriod: (period: HistoricalPeriod) => void;
}

export default function PeriodSelector({ periods, selectedPeriod, onSelectPeriod }: PeriodSelectorProps) {
  const [sliderValue, setSliderValue] = useState(0);

  useEffect(() => {
    if (selectedPeriod) {
      const index = periods.findIndex((p) => p.era === selectedPeriod.era);
      setSliderValue(index >= 0 ? index : 0);
    } else if (periods.length > 0) {
      setSliderValue(0);
      onSelectPeriod(periods[0]);
    }
  }, [selectedPeriod, periods, onSelectPeriod]);

  if (periods.length === 0) {
    return (
      <div className="py-4 px-6 rounded-xl bg-card/50 text-foreground/70 text-sm border border-glass-border">
        No temporal data available
      </div>
    );
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = Number(e.target.value);
    setSliderValue(index);
    onSelectPeriod(periods[index]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-glass-bg p-4 rounded-lg border border-glass-border shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-thai text-foreground/70">Time Slider</h2>
      </div>
      <div className="relative px-4">
        <input
          type="range"
          min={0}
          max={periods.length - 1}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-2 bg-card rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_10px_var(--primary)]"
          aria-label="Select historical period"
          aria-valuemin={0}
          aria-valuemax={periods.length - 1}
          aria-valuenow={sliderValue}
        />
        <div className="flex justify-between mt-2">
          {periods.map((period, index) => (
            <motion.span
              key={period.era}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: sliderValue === index ? 1 : 0.5, y: 0 }}
              whileHover={{ scale: 1.1 }}
              className={`text-xs font-thai ${
                sliderValue === index ? "text-primary font-bold" : "text-foreground/70"
              }`}
            >
              {period.era}
            </motion.span>
          ))}
        </div>
      </div>
      {selectedPeriod && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-2 mt-4 bg-card/50 rounded-lg border border-glass-border"
        >
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedPeriod.color }} />
          <span className="text-sm font-thai text-foreground">{selectedPeriod.yearRange}</span>
        </motion.div>
      )}
    </motion.div>
  );
}