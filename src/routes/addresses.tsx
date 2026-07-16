import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthState, useRequireRole } from "@/lib/auth";
import { addAddress, getAddresses } from "@/lib/queries";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Địa chỉ đã lưu" }] }),
  component: Addresses,
});

function Addresses() {
  useRequireRole("customer");
  const authState = useAuthState();
  const userId = authState.session?.user.id;
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => getAddresses(userId!),
    enabled: !!userId,
  });

  const addMutation = useMutation({
    mutationFn: (input: { label: string; address: string; icon?: string }) =>
      addAddress(userId!, input),
    onSuccess: () => {
      toast.success("Đã thêm địa chỉ mới");
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      setSheetOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không thêm được địa chỉ."),
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <div className="safe-top flex items-center gap-3 px-5 py-3">
        <button
          onClick={() => history.back()}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-black">Địa chỉ đã lưu</h1>
      </div>

      {isLoading ? (
        <div className="grid h-32 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="mx-5 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Bạn chưa lưu địa chỉ nào.
        </div>
      ) : (
        <div className="space-y-2 px-5">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl bg-surface p-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-background text-xl">
                {a.icon ?? "📍"}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.address}</div>
              </div>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 px-5">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> Thêm địa chỉ mới
        </button>
      </div>

      <AddAddressSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        submitting={addMutation.isPending}
        onSave={(input) => addMutation.mutate(input)}
      />
    </div>
  );
}

function AddAddressSheet({
  open,
  onOpenChange,
  submitting,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  submitting: boolean;
  onSave: (input: { label: string; address: string; icon?: string }) => void;
}) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    if (!label.trim() || !address.trim()) {
      setError("Vui lòng nhập tên gợi nhớ và địa chỉ");
      return;
    }
    setError("");
    onSave({ label: label.trim(), address: address.trim(), icon: "📍" });
    setLabel("");
    setAddress("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Thêm địa chỉ mới</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Tên gợi nhớ</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VD: Nhà, Công ty"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Địa chỉ</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: 123 Lê Duẩn, Phường 1, Cao Lãnh"
              className="mt-1"
            />
          </div>
          {error && <p className="text-[12px] text-primary">{error}</p>}
          <button
            onClick={save}
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Lưu địa chỉ
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
