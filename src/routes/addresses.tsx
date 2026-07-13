import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Plus } from "lucide-react";
import { SAVED_ADDRESSES } from "@/lib/mock";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Địa chỉ đã lưu" }] }),
  component: Addresses,
});

function Addresses() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Địa chỉ đã lưu</h1>
      </div>
      <div className="space-y-2 px-5">
        {SAVED_ADDRESSES.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-2xl bg-surface p-4">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-background text-xl">{a.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-bold">{a.label}</div>
              <div className="text-xs text-muted-foreground">{a.address}</div>
            </div>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>
      <div className="mt-4 px-5">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> Thêm địa chỉ mới
        </button>
      </div>
    </div>
  );
}
