import { cn } from "@/lib/utils";
import { MapPin, Navigation } from "lucide-react";

/**
 * Demo map — a stylized SVG placeholder for Cao Lãnh.
 * Shows streets, current location, and nearby drivers.
 */
export function MapPreview({
  className,
  showRoute = false,
  driverPin = false,
  showNearbyDrivers = false,
}: {
  className?: string;
  showRoute?: boolean;
  driverPin?: boolean;
  showNearbyDrivers?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden map-bg", className)}>
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {/* Blocks / parks */}
        <rect x="40" y="60" width="90" height="70" rx="6" fill="oklch(0.55 0.08 145 / 0.18)" />
        <rect x="260" y="220" width="110" height="80" rx="6" fill="oklch(0.55 0.08 145 / 0.15)" />
        <rect x="150" y="300" width="70" height="60" rx="4" fill="oklch(0.6 0.02 240 / 0.12)" />

        {/* River */}
        <path
          d="M -10 340 Q 80 300 160 320 T 340 280 T 420 260"
          stroke="oklch(0.55 0.12 230 / 0.5)"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />

        {/* Main roads */}
        <path d="M 0 200 L 400 200" stroke="oklch(0.85 0.02 240 / 0.35)" strokeWidth="10" fill="none" />
        <path d="M 200 0 L 200 400" stroke="oklch(0.85 0.02 240 / 0.35)" strokeWidth="10" fill="none" />
        <path d="M 0 100 Q 120 110 220 90 T 400 70" stroke="oklch(0.85 0.02 240 / 0.28)" strokeWidth="7" fill="none" />
        <path d="M 40 0 L 60 400" stroke="oklch(0.85 0.02 240 / 0.22)" strokeWidth="5" fill="none" />
        <path d="M 340 0 L 320 400" stroke="oklch(0.85 0.02 240 / 0.22)" strokeWidth="5" fill="none" />

        {/* Secondary streets */}
        <path d="M 0 260 L 400 260" stroke="oklch(0.85 0.02 240 / 0.18)" strokeWidth="3" fill="none" />
        <path d="M 0 140 L 400 140" stroke="oklch(0.85 0.02 240 / 0.18)" strokeWidth="3" fill="none" />
        <path d="M 120 0 L 130 400" stroke="oklch(0.85 0.02 240 / 0.18)" strokeWidth="3" fill="none" />
        <path d="M 280 0 L 270 400" stroke="oklch(0.85 0.02 240 / 0.18)" strokeWidth="3" fill="none" />

        {/* Street center dashes */}
        <path d="M 0 200 L 400 200" stroke="oklch(0.98 0 0 / 0.35)" strokeWidth="1" strokeDasharray="6 8" fill="none" />
        <path d="M 200 0 L 200 400" stroke="oklch(0.98 0 0 / 0.35)" strokeWidth="1" strokeDasharray="6 8" fill="none" />

        {showRoute && (
          <path
            d="M 100 300 Q 180 260 220 200 T 320 100"
            stroke="oklch(0.62 0.22 25)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Current location (customer) — red */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute -inset-4 animate-ping rounded-full bg-primary/25" />
          <div className="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-background/60">
            <MapPin className="h-4 w-4" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Nearby drivers */}
      {showNearbyDrivers && (
        <>
          <DriverDot className="left-[22%] top-[28%]" />
          <DriverDot className="left-[72%] top-[36%]" />
          <DriverDot className="left-[30%] top-[70%]" />
          <DriverDot className="left-[68%] top-[64%]" />
          <DriverDot className="left-[46%] top-[22%]" />
        </>
      )}

      {showRoute && (
        <div className="absolute right-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground shadow-glow">
            <Navigation className="h-4 w-4" fill="currentColor" />
          </div>
        </div>
      )}

      {driverPin && (
        <div className="absolute left-1/3 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-foreground text-background text-lg shadow-elevated">
            🚗
          </div>
        </div>
      )}
    </div>
  );
}

function DriverDot({ className }: { className?: string }) {
  return (
    <div className={cn("absolute -translate-x-1/2 -translate-y-1/2", className)}>
      <div className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-background text-sm shadow-elevated ring-2 ring-background/70">
        🚗
      </div>
    </div>
  );
}
