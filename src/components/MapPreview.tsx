import { cn } from "@/lib/utils";
import { MapPin, Navigation } from "lucide-react";

/**
 * Demo map — a stylized SVG placeholder for Cao Lãnh.
 * Replace with Mapbox / Google Maps once an API key is configured.
 */
export function MapPreview({ className, showRoute = false, driverPin = false }: { className?: string; showRoute?: boolean; driverPin?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden map-bg", className)}>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full opacity-60">
        <path d="M 20 320 Q 120 300 200 240 T 380 120" stroke="oklch(0.7 0.02 240)" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M 60 60 L 340 340" stroke="oklch(0.7 0.02 240)" strokeWidth="4" fill="none" opacity="0.25" />
        <path d="M 20 200 L 380 200" stroke="oklch(0.7 0.02 240)" strokeWidth="3" fill="none" opacity="0.2" />
        <path d="M 200 20 L 200 380" stroke="oklch(0.7 0.02 240)" strokeWidth="3" fill="none" opacity="0.2" />
        {showRoute && (
          <path d="M 100 300 Q 180 260 220 200 T 320 100" stroke="oklch(0.62 0.22 25)" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="0" />
        )}
      </svg>

      {/* Pickup pin */}
      <div className="absolute left-1/4 top-2/3 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute -inset-3 animate-ping rounded-full bg-primary/30" />
          <div className="relative grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <MapPin className="h-4 w-4" fill="currentColor" />
          </div>
        </div>
      </div>

      {showRoute && (
        <div className="absolute right-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground shadow-glow">
            <Navigation className="h-4 w-4" fill="currentColor" />
          </div>
        </div>
      )}

      {driverPin && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-foreground text-background text-lg shadow-elevated">
            🚗
          </div>
        </div>
      )}

      <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80">
        Cao Lãnh · Demo Map
      </div>
    </div>
  );
}
