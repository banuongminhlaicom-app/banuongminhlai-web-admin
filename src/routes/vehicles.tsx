import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Plus, Star } from "lucide-react";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/vehicles")({
  head: () => ({ meta: [{ title: "Phương tiện của tôi" }] }),
  component: Vehicles,
});

const VEHICLES = [
  {
    id: 1,
    name: "Toyota Vios 2022",
    plate: "66A-123.45",
    type: "Ô tô số tự động",
    color: "Đen",
    isDefault: true,
  },
  {
    id: 2,
    name: "Honda SH 150i",
    plate: "66-B1 456.78",
    type: "Xe máy",
    color: "Trắng",
    isDefault: false,
  },
];

function Vehicles() {
  useRequireRole("customer");
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button
          onClick={() => history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Phương tiện của tôi</h1>
      </div>

      <div className="space-y-3 px-5">
        {VEHICLES.map((v) => (
          <div key={v.id} className="rounded-3xl bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  {v.type} · {v.color}
                </div>
                <div className="mt-2 inline-block rounded-lg border border-dashed border-border bg-background px-3 py-1 font-mono text-sm font-bold">
                  {v.plate}
                </div>
              </div>
              {v.isDefault && (
                <div className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary">
                  <Star className="inline h-3 w-3" /> Mặc định
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-xl bg-background py-2 text-xs font-bold">
                Chỉnh sửa
              </button>
              {!v.isDefault && (
                <button className="flex-1 rounded-xl bg-background py-2 text-xs font-bold">
                  Đặt mặc định
                </button>
              )}
              <button className="flex-1 rounded-xl bg-destructive/15 py-2 text-xs font-bold text-destructive">
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 px-5">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold text-muted-foreground">
          <Plus className="h-4 w-4" /> Thêm xe mới
        </button>
      </div>
    </div>
  );
}
