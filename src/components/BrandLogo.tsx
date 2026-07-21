import { useState } from "react";
import { cn } from "@/lib/utils";

// Logo tuỳ chỉnh đặt tại `public/logo.png` (Vite phục vụ ở đường dẫn `/logo.png`).
// Nếu chưa có file, component tự vẽ logo SVG mặc định nên giao diện không vỡ.
const CUSTOM_LOGO_SRC = "/logo.png";

// Logo hiện tại là dạng WORDMARK (bản thân ảnh đã chứa chữ "BẠN UỐNG MÌNH LÁI")
// và là ảnh vuông có nhiều khoảng đệm quanh chữ. Nên hiển thị trong khung ngang
// tỉ lệ ~2.6:1 kèm object-cover để cắt bớt phần đệm, lấy đúng dải chữ ở giữa.
const LOGO_BOX: Record<string, string> = {
  sm: "h-8 w-[5.25rem]",
  md: "h-10 w-[6.5rem]",
  lg: "h-16 w-[10.5rem]",
};

const FALLBACK_BOX: Record<string, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function BrandLogo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  /**
   * Chỉ áp dụng cho logo SVG mặc định. Logo tuỳ chỉnh đã có sẵn chữ trong ảnh
   * nên không hiện thêm chữ bên cạnh, tránh lặp tên thương hiệu hai lần.
   */
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [useFallback, setUseFallback] = useState(false);

  if (!useFallback) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={CUSTOM_LOGO_SRC}
          alt="Bạn Uống Mình Lái"
          className={cn("rounded-xl object-cover", LOGO_BOX[size])}
          // Chưa upload file (hoặc sai tên) -> quay về logo mặc định.
          onError={() => setUseFallback(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-2xl gradient-primary shadow-glow",
          FALLBACK_BOX[size],
        )}
      >
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
