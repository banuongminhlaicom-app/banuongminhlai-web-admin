import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag, Copy, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { getPromotions, findActivePromotionByCode } from "@/lib/queries";
import { formatDiscount } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/promotions")({
  head: () => ({ meta: [{ title: "Mã ưu đãi" }] }),
  component: PromotionsScreen,
});

function PromotionsScreen() {
  useRequireRole("customer");
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const { data: promotions, isLoading } = useQuery({
    queryKey: ["promotions"],
    queryFn: getPromotions,
  });

  const apply = async () => {
    if (!code.trim() || checking) return;
    setChecking(true);
    try {
      const promo = await findActivePromotionByCode(code);
      if (promo) {
        toast.success(
          `Đã áp dụng mã ${promo.code} (-${formatDiscount(promo.discount, promo.discount_type)})`,
        );
      } else {
        toast.error("Mã ưu đãi không hợp lệ hoặc đã hết hạn");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không kiểm tra được mã.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <MobileShell>
      <div className="safe-top px-5 pt-3">
        <h1 className="text-2xl font-black">Ưu đãi</h1>
      </div>
      <div className="mt-4 flex gap-2 px-5">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Nhập mã ưu đãi..."
          className="flex-1 rounded-2xl bg-surface px-4 py-3 text-sm font-semibold outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={apply}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-2xl gradient-primary px-5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {checking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Áp dụng
        </button>
      </div>

      <div className="mt-5 space-y-3 px-5">
        {isLoading ? (
          <div className="grid h-32 place-items-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !promotions || promotions.length === 0 ? (
          <div className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">
            Hiện chưa có ưu đãi nào.
          </div>
        ) : (
          promotions.map((p) => (
            <div
              key={p.id}
              className={cn(
                "relative overflow-hidden rounded-3xl bg-surface p-4",
                !p.active && "opacity-50",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground">
                  <Tag className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-base font-black">{p.title}</div>
                    {!p.active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                        Ngừng hoạt động
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    HSD:{" "}
                    {p.expires_at
                      ? new Date(p.expires_at).toLocaleDateString("vi-VN")
                      : "Không giới hạn"}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="rounded-lg border border-dashed border-primary/50 bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                      {p.code}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(p.code);
                        toast.success("Đã sao chép mã");
                      }}
                      className="grid h-7 w-7 place-items-center rounded-lg bg-background text-muted-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <div className="ml-auto text-sm font-bold text-primary">
                      -{formatDiscount(p.discount, p.discount_type)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MobileShell>
  );
}
