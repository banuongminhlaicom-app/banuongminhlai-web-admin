import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { DEFAULT_PRICING, calculateQuote, type PricingRule } from "@/lib/pricing";
import { formatVND } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({ meta: [{ title: "Admin · Bảng giá" }] }),
  component: AdminPricing,
});

const FIELDS: Array<{ key: keyof PricingRule; label: string; suffix?: string }> = [
  { key: "openingFee", label: "Phí mở cửa", suffix: "đ" },
  { key: "minimumPrice", label: "Giá tối thiểu", suffix: "đ" },
  { key: "firstDistanceLimit", label: "Số km đầu", suffix: "km" },
  { key: "firstDistancePrice", label: "Giá cho km đầu", suffix: "đ" },
  { key: "pricePerExtraKm", label: "Giá mỗi km tiếp theo", suffix: "đ" },
  { key: "waitingPricePerMinute", label: "Phí chờ / phút", suffix: "đ" },
  { key: "nightSurchargePercent", label: "Phụ phí ban đêm", suffix: "%" },
  { key: "nightStartHour", label: "Giờ bắt đầu đêm", suffix: "h" },
  { key: "nightEndHour", label: "Giờ kết thúc đêm", suffix: "h" },
];

function AdminPricing() {
  const [rule, setRule] = useState<PricingRule>(DEFAULT_PRICING);
  const preview = calculateQuote({ distanceKm: 6.8, rule });

  return (
    <AdminLayout title="Cài đặt bảng giá">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl bg-surface p-5">
          <div className="mb-3 text-sm text-muted-foreground">Bảng giá đang áp dụng cho khu vực <span className="font-bold text-foreground">Cao Lãnh, Đồng Tháp</span>. Thay đổi chỉ ảnh hưởng đến chuyến đặt sau khi lưu.</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <div className="mb-1 text-xs font-semibold text-muted-foreground">{f.label}</div>
                <div className="flex items-center gap-2 rounded-xl bg-background p-3">
                  <input
                    type="number"
                    value={rule[f.key]}
                    onChange={(e) => setRule({ ...rule, [f.key]: Number(e.target.value) })}
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  />
                  <span className="text-xs text-muted-foreground">{f.suffix}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setRule(DEFAULT_PRICING)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Đặt lại mặc định</button>
            <button onClick={() => toast.success("Đã lưu bảng giá mới")} className="rounded-xl gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-glow">Lưu thay đổi</button>
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-5">
          <h3 className="mb-1 text-sm font-bold">Xem trước báo giá</h3>
          <p className="text-xs text-muted-foreground">Ví dụ với chuyến 6,8 km</p>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Phí mở cửa" value={preview.openingFee} />
            <Row label="Phí quãng đường" value={preview.distanceFee} />
            {preview.nightSurcharge > 0 && <Row label="Phụ phí đêm" value={preview.nightSurcharge} />}
            <div className="border-t border-border pt-2" />
            <div className="flex items-baseline justify-between">
              <span>Tổng dự kiến</span>
              <span className="text-2xl font-black text-primary">{formatVND(preview.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-bold">{formatVND(value)}</span></div>;
}
