import { cn } from "@/lib/utils";

export function BrandLogo({ className, showText = true, size = "md" }: { className?: string; showText?: boolean; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-10 w-10";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative grid place-items-center rounded-2xl gradient-primary shadow-glow", s)}>
        <svg viewBox="0 0 24 24" fill="none" className="h-3/5 w-3/5 text-primary-foreground">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <div className="leading-none">
          <div className={cn("font-black tracking-tight", size === "lg" ? "text-xl" : "text-sm")}>BẠN UỐNG</div>
          <div className={cn("font-black tracking-tight text-primary", size === "lg" ? "text-xl" : "text-sm")}>MÌNH LÁI</div>
        </div>
      )}
    </div>
  );
}
