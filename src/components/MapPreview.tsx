import { cn } from "@/lib/utils";
import { MapPin, Navigation } from "lucide-react";

/**
 * Google Maps embed for Cao Lãnh, Đồng Tháp.
 * Uses the public Google Maps embed (no API key required).
 * Decorative overlays (customer pin, nearby drivers) render on top.
 */
export function MapPreview({
  className,
  showRoute = false,
  driverPin = false,
  showNearbyDrivers = false,
  query = "Cao Lãnh, Đồng Tháp",
  zoom = 15,
}: {
  className?: string;
  showRoute?: boolean;
  driverPin?: boolean;
  showNearbyDrivers?: boolean;
  query?: string;
  zoom?: number;
}) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(
    query
  )}&z=${zoom}&hl=vi&output=embed`;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <iframe
        title="Bản đồ Cao Lãnh"
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Subtle overlay to keep pins readable */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20" />

      {/* Current location (customer) — red */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="absolute -inset-4 animate-ping rounded-full bg-primary/25" />
          <div className="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-background/60">
            <MapPin className="h-4 w-4" fill="currentColor" />
          </div>
        </div>
      </div>

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
        <div className="pointer-events-none absolute right-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground shadow-glow">
            <Navigation className="h-4 w-4" fill="currentColor" />
          </div>
        </div>
      )}

      {driverPin && (
        <div className="pointer-events-none absolute left-1/3 top-1/3 -translate-x-1/2 -translate-y-1/2">
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
    <div className={cn("pointer-events-none absolute -translate-x-1/2 -translate-y-1/2", className)}>
      <div className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-background text-sm shadow-elevated ring-2 ring-background/70">
        🚗
      </div>
    </div>
  );
}
