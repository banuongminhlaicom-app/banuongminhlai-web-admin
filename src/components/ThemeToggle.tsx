import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "row";
}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  if (variant === "row") {
    return (
      <button
        onClick={toggle}
        className={cn("flex w-full items-center gap-3 p-4 active:bg-background/30", className)}
        aria-label="Chuyển chế độ sáng tối"
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-background text-primary">
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">Giao diện</div>
          <div className="text-[11px] text-muted-foreground">
            {isDark ? "Chế độ tối" : "Chế độ sáng"}
          </div>
        </div>
        <div
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            isDark ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all",
              isDark ? "left-[22px]" : "left-0.5",
            )}
          />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Chuyển chế độ sáng tối"
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full bg-surface transition-colors hover:bg-surface-elevated",
        className,
      )}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
