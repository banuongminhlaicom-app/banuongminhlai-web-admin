import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DriverShell } from "@/components/DriverShell";
import { useDriver } from "@/lib/driver-store";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/driver/earnings")({
  head: () => ({ meta: [{ title: "Thu nhập tài xế" }] }),
  component: Earnings,
});

const TX = [
  { code: "BUML-8821", amount: 127000, time: "20:15 hôm nay" },
  { code: "BUML-8798", amount: 245000, time: "23:10 hôm qua" },
  { code: "BUML-8790", amount: 115000, time: "21:40 hôm qua" },
  { code: "BUML-8781", amount: 180000, time: "22:20, 11/07" },
  { code: "BUML-8770", amount: 100000, time: "20:00, 10/07" },
];

function Earnings() {
  const s = useDriver();
  const week = 4230000 + (s.todayRevenue - 890000);
  const month = 18450000 + (s.todayRevenue - 890000);
  const fee = Math.round(month * 0.15);
  const net = month - fee;

  return (
    <DriverShell>
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <Link to="/driver" className="grid h-10 w-10 place-items-center rounded-full bg-surface">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-black">Thu nhập</h1>
      </div>

      <div className="mx-5 rounded-3xl gradient-primary p-5 text-primary-foreground shadow-glow">
        <div className="text-xs font-semibold uppercase opacity-80">
          Doanh thu tháng 07/2026
        </div>
        <div className="mt-2 text-3xl font-black">{formatVND(month)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-center text-xs">
          <div>
            <div className="opacity-80">Hôm nay</div>
            <div className="font-bold">{formatVND(s.todayRevenue)}</div>
          </div>
          <div>
            <div className="opacity-80">Tuần này</div>
            <div className="font-bold">{formatVND(week)}</div>
          </div>
          <div>
            <div className="opacity-80">Thực nhận</div>
            <div className="font-bold">{formatVND(net)}</div>
          </div>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-3xl bg-surface p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tổng chuyến</span>
          <span className="font-bold">{124 + (s.todayTrips - 7)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">Phí nền tảng (15%)</span>
          <span className="font-bold">-{formatVND(fee)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">Thu nhập thực nhận</span>
          <span className="font-black text-success">{formatVND(net)}</span>
        </div>
        <button className="mt-3 w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow">
          Yêu cầu rút tiền
        </button>
      </div>

      <h3 className="mb-2 mt-6 px-5 text-sm font-bold">Lịch sử giao dịch</h3>
      <div className="mx-5 divide-y divide-border/60 overflow-hidden rounded-2xl bg-surface">
        {TX.map((t) => (
          <div key={t.code} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm font-bold">{t.code}</div>
              <div className="text-xs text-muted-foreground">{t.time}</div>
            </div>
            <div className="text-sm font-black text-success">
              +{formatVND(t.amount)}
            </div>
          </div>
        ))}
      </div>
    </DriverShell>
  );
}
