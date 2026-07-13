import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Banknote, CreditCard, QrCode, Wallet as WalletIcon } from "lucide-react";
import { formatVND } from "@/lib/format";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "Ví & thanh toán" }] }),
  component: Wallet,
});

const METHODS = [
  { Icon: Banknote, label: "Tiền mặt", desc: "Trả trực tiếp cho tài xế", active: true },
  { Icon: QrCode, label: "Chuyển khoản QR", desc: "VietQR - MB Bank", active: true },
  { Icon: CreditCard, label: "Thẻ ngân hàng", desc: "Sắp ra mắt", disabled: true },
  { Icon: WalletIcon, label: "Ví điện tử", desc: "Momo, ZaloPay - Sắp ra mắt", disabled: true },
];

function Wallet() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Ví & thanh toán</h1>
      </div>

      <div className="mx-5 rounded-3xl gradient-primary p-5 shadow-glow">
        <div className="text-xs font-semibold uppercase text-primary-foreground/80">Số dư ví</div>
        <div className="mt-2 text-3xl font-black text-primary-foreground">{formatVND(230000)}</div>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-2xl bg-background/20 py-2.5 text-xs font-bold text-primary-foreground">Nạp tiền</button>
          <button className="flex-1 rounded-2xl bg-background/20 py-2.5 text-xs font-bold text-primary-foreground">Lịch sử</button>
        </div>
      </div>

      <div className="mx-5 mt-6">
        <h3 className="mb-2 text-sm font-bold">Phương thức thanh toán</h3>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <div key={m.label} className={`flex items-center gap-3 rounded-2xl bg-surface p-4 ${m.disabled ? "opacity-50" : ""}`}>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-background text-primary"><m.Icon className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="text-sm font-bold">{m.label}</div>
                <div className="text-xs text-muted-foreground">{m.desc}</div>
              </div>
              {m.active && <div className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">Đang dùng</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
