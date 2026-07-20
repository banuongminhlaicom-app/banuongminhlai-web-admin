import { useState } from "react";
import { cn } from "@/lib/utils";

// Đường dẫn logo tuỳ chỉnh. Đặt file vào thư mục `public/` của dự án là dùng
// được ngay (Vite phục vụ `public/logo.png` tại đường dẫn `/logo.png`).
// Nếu chưa có file, component tự vẽ logo SVG mặc định nên giao diện không vỡ.
const CUSTOM_LOGO_SRC = "/logo.png";

export function BrandLogo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [useFallback, setUseFallback] = useState(false);
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-10 w-10";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-2xl",
          // Nền gradient chỉ dùng cho logo SVG mặc định; logo tự upload thường
          // đã có nền/màu riêng nên để trong suốt cho khỏi chỏi màu.
          useFallback ? "gradient-primary shadow-glow" : "bg-transparent",
          s,
        )}
      >
        {useFallback ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-3/5 w-3/5 text-primary-foreground">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
            <path
              d="M12 3v4M12 17v4M3 12h4M17 12h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <img
            src={CUSTOM_LOGO_SRC}
            alt="Bạn Uống Mình Lái"
            className="h-full w-full object-contain"
            // Chưa upload file (hoặc sai tên) -> quay về logo mặc định.
            onError={() => setUseFallback(true)}
          />
        )}
      </div>
      {showText && (
        <div className="leading-none">
          <div className={cn("font-black tracking-tight", size === "lg" ? "text-xl" : "text-sm")}>
            BẠN UỐNG
          </div>
          <div
            className={cn(
              "font-black tracking-tight text-primary",
              size === "lg" ? "text-xl" : "text-sm",
            )}
          >
            MÌNH LÁI
          </div>
        </div>
      )}
    </div>
  );
}
