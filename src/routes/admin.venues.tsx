import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  createPartnerVenue,
  deletePartnerVenue,
  getPartnerVenuesAdmin,
  removePartnerVenueImage,
  swapPartnerVenueOrder,
  togglePartnerVenueActive,
  updatePartnerVenue,
  uploadPartnerVenueImage,
  type PartnerVenueInput,
  type PartnerVenueRow,
} from "@/lib/queries";
import { fetchPlaceSuggestions, type PlaceSuggestion } from "@/lib/places";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/venues")({
  head: () => ({ meta: [{ title: "Admin · Địa điểm đối tác" }] }),
  component: AdminVenues,
});

function AdminVenues() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data: venues, isLoading } = useQuery({
    queryKey: ["admin", "venues"],
    queryFn: getPartnerVenuesAdmin,
  });

  const [editing, setEditing] = useState<PartnerVenueRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<PartnerVenueRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "venues"] });
    queryClient.invalidateQueries({ queryKey: ["partner-venues"] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      togglePartnerVenueActive(id, active),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không cập nhật được."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartnerVenue(id),
    onSuccess: () => {
      toast.success("Đã xoá địa điểm");
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không xoá được."),
  });

  const reorderMutation = useMutation({
    mutationFn: ({
      aId,
      aOrder,
      bId,
      bOrder,
    }: {
      aId: string;
      aOrder: number;
      bId: string;
      bOrder: number;
    }) => swapPartnerVenueOrder(aId, aOrder, bId, bOrder),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không đổi được thứ tự."),
  });

  // Danh sách đã được sắp theo sort_order desc từ query — "lên" nghĩa là đổi
  // chỗ với dòng phía trên (đứng trước trong mảng).
  const moveVenue = (index: number, direction: "up" | "down") => {
    if (!venues) return;
    const otherIndex = direction === "up" ? index - 1 : index + 1;
    if (otherIndex < 0 || otherIndex >= venues.length) return;
    const a = venues[index];
    const b = venues[otherIndex];
    reorderMutation.mutate({ aId: a.id, aOrder: a.sort_order, bId: b.id, bOrder: b.sort_order });
  };

  return (
    <AdminLayout title="Địa điểm đối tác">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Nhà hàng/quán ăn đối tác trả phí quảng cáo — hiện ở khối "Địa điểm gần bạn" trên trang
          chủ. Bấm vào 1 thẻ sẽ tự điền địa điểm đó làm điểm đến khi đặt xe.
        </p>
        <button
          onClick={() => setEditing("new")}
          className="flex shrink-0 items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm địa điểm
        </button>
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-4">Thứ tự</th>
                <th className="p-4">Ảnh</th>
                <th className="p-4">Tên</th>
                <th className="p-4">Địa chỉ</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!venues || venues.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                    Chưa có địa điểm đối tác nào.
                  </td>
                </tr>
              ) : (
                venues.map((v, i) => (
                  <tr key={v.id}>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveVenue(i, "up")}
                          disabled={i === 0 || reorderMutation.isPending}
                          aria-label="Đưa lên trên"
                          className="grid h-6 w-6 place-items-center rounded-md bg-background disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveVenue(i, "down")}
                          disabled={i === venues.length - 1 || reorderMutation.isPending}
                          aria-label="Đưa xuống dưới"
                          className="grid h-6 w-6 place-items-center rounded-md bg-background disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <VenueImageCell venue={v} onChanged={invalidate} />
                    </td>
                    <td className="p-4 font-semibold">{v.name}</td>
                    <td className="p-4 max-w-xs truncate text-muted-foreground">{v.address}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${v.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        {v.active ? "Đang hiện" : "Đang ẩn"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => toggleMutation.mutate({ id: v.id, active: !v.active })}
                          disabled={toggleMutation.isPending}
                          className="rounded-md bg-background px-2 py-1 text-xs disabled:opacity-60"
                        >
                          {v.active ? "Ẩn" : "Hiện"}
                        </button>
                        <button
                          onClick={() => setEditing(v)}
                          aria-label="Sửa địa điểm"
                          className="grid h-7 w-7 place-items-center rounded-md bg-background"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleting(v)}
                          aria-label="Xoá địa điểm"
                          className="grid h-7 w-7 place-items-center rounded-md bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <VenueFormModal
          venue={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setDeleting(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-black">Xoá "{deleting.name}"?</div>
            <p className="mt-1 text-sm text-muted-foreground">Hành động này không thể hoàn tác.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Huỷ
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleting.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-60"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Form tạo mới/sửa địa điểm — ô địa chỉ có gợi ý (Goong AutoComplete), chọn 1
// gợi ý mới lấy được toạ độ thật (bắt buộc để bấm thẻ ở Home đặt xe đúng chỗ).
function VenueFormModal({
  venue,
  onClose,
  onSaved,
}: {
  venue: PartnerVenueRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(venue?.name ?? "");
  const [address, setAddress] = useState(venue?.address ?? "");
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(
    venue ? { lat: venue.lat, lng: venue.lng } : null,
  );
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(venue?.image_url ?? null);

  // Xem trước ảnh vừa chọn ngay trong form, chưa upload lên Supabase vội — chỉ
  // thật sự upload sau khi tạo/sửa địa điểm thành công (cần có venueId trước).
  const onPickImage = (file: File) => {
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const isValid = name.trim().length > 0 && address.trim().length > 0 && coord !== null;

  const onAddressChange = (value: string) => {
    setAddress(value);
    setCoord(null); // gõ lại địa chỉ nghĩa là toạ độ cũ không còn khớp nữa
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSuggestions(await fetchPlaceSuggestions(value));
      } catch {
        setSuggestions([]);
      }
    }, 400);
  };

  const pickSuggestion = async (s: PlaceSuggestion) => {
    try {
      const { address: fullAddress, coord: resolvedCoord } = await s.resolve();
      setAddress(fullAddress);
      setCoord(resolvedCoord);
      setSuggestions([]);
    } catch {
      // giữ nguyên text đã gõ, không có toạ độ thì isValid vẫn chặn submit
    }
  };

  const submit = async () => {
    if (!isValid || saving || !coord) return;
    setSaving(true);
    const input: PartnerVenueInput = {
      name: name.trim(),
      address: address.trim(),
      lat: coord.lat,
      lng: coord.lng,
    };
    try {
      const venueId = venue ? venue.id : (await createPartnerVenue(input)).id;
      if (venue) await updatePartnerVenue(venue.id, input);
      // Chỉ upload nếu vừa chọn ảnh mới trong form này — sửa mà không đổi ảnh
      // thì giữ nguyên ảnh cũ, không gọi lại upload vô ích.
      if (imageFile) await uploadPartnerVenueImage(venueId, imageFile);
      toast.success(venue ? "Đã cập nhật địa điểm" : "Đã thêm địa điểm mới");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được địa điểm.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-black">
            {venue ? "Sửa địa điểm" : "Thêm địa điểm đối tác"}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Tên quán</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Quán Nhậu ABC"
            />
          </label>

          <label className="relative block">
            <span className="text-xs font-semibold text-muted-foreground">Địa chỉ</span>
            <input
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Gõ để tìm địa chỉ..."
            />
            {suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-elevated">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-background"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
            {!coord && address.trim().length > 0 && (
              <span className="mt-1 block text-[11px] text-warning">
                Chọn 1 gợi ý ở trên để lấy đúng toạ độ.
              </span>
            )}
          </label>

          <div>
            <span className="text-xs font-semibold text-muted-foreground">
              Ảnh quán (không bắt buộc)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickImage(file);
              }}
            />
            <div className="mt-1 flex items-center gap-3">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Ảnh quán"
                  className="h-16 w-24 rounded-xl object-cover ring-1 ring-border"
                />
              ) : (
                <div className="grid h-16 w-24 place-items-center rounded-xl bg-surface text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-surface px-3 py-2 text-xs font-semibold"
              >
                {imagePreview ? "Đổi ảnh" : "Chọn ảnh"}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!isValid || saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {venue ? "Lưu thay đổi" : "Thêm địa điểm"}
        </button>
      </div>
    </div>
  );
}

// Ô ảnh riêng cho từng dòng — cùng kiểu với BannerImageCell ở admin.promotions.tsx.
function VenueImageCell({ venue, onChanged }: { venue: PartnerVenueRow; onChanged: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadPartnerVenueImage(venue.id, file);
      toast.success("Đã tải ảnh");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải được ảnh.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await removePartnerVenueImage(venue.id);
      toast.success("Đã xoá ảnh");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không xoá được ảnh.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {venue.image_url ? (
        <>
          <img
            src={venue.image_url}
            alt={venue.name}
            className="h-12 w-18 rounded-lg object-cover ring-1 ring-border"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-background px-2 py-1 text-xs disabled:opacity-60"
          >
            Đổi
          </button>
          <button
            onClick={handleRemove}
            disabled={uploading}
            aria-label="Xoá ảnh"
            className="grid h-7 w-7 place-items-center rounded-md bg-destructive/10 text-destructive disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          Tải ảnh
        </button>
      )}
    </div>
  );
}
