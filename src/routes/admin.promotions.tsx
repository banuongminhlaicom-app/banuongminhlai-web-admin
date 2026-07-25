import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  removePromotionBanner,
  updatePromotion,
  uploadPromotionBanner,
  type DiscountType,
  type PromotionInput,
  type PromotionRow,
} from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { formatDiscount } from "@/lib/format";
import { toast } from "sonner";
import { useRequireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/promotions")({
  head: () => ({ meta: [{ title: "Admin · Ưu đãi" }] }),
  component: AdminPromos,
});

async function togglePromotionActive(id: string, active: boolean) {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  const { error } = await supabase.from("promotions").update({ active }).eq("id", id);
  if (error) throw error;
}

function AdminPromos() {
  useRequireRole("admin");
  const queryClient = useQueryClient();
  const { data: promotions, isLoading } = useQuery({
    queryKey: ["admin", "promotions"],
    queryFn: getPromotions,
  });

  // null = form đóng; undefined = đang tạo mới; PromotionRow = đang sửa mã đó.
  const [editing, setEditing] = useState<PromotionRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<PromotionRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
    queryClient.invalidateQueries({ queryKey: ["promotions"] });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      togglePromotionActive(id, active),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái mã ưu đãi");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không cập nhật được."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => {
      toast.success("Đã xoá mã ưu đãi");
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Không xoá được."),
  });

  return (
    <AdminLayout title="Quản lý mã ưu đãi">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Ảnh banner nên thiết kế tỉ lệ <span className="font-semibold text-foreground">3:2</span>{" "}
          (khuyến nghị 1200×800px), định dạng JPG/PNG — hiện trong khối "Ưu đãi" ở trang chủ.
        </p>
        <button
          onClick={() => setEditing("new")}
          className="flex shrink-0 items-center gap-1.5 rounded-xl gradient-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-glow"
        >
          <Plus className="h-3.5 w-3.5" /> Tạo mã mới
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
                <th className="p-4">Banner</th>
                <th className="p-4">Mã</th>
                <th className="p-4">Tiêu đề</th>
                <th className="p-4">Giảm</th>
                <th className="p-4">HSD</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!promotions || promotions.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                    Chưa có mã ưu đãi nào.
                  </td>
                </tr>
              ) : (
                promotions.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4">
                      <BannerImageCell promotion={p} onChanged={invalidate} />
                    </td>
                    <td className="p-4 font-mono font-bold">{p.code}</td>
                    <td className="p-4">{p.title}</td>
                    <td className="p-4 font-black text-primary">
                      -{formatDiscount(p.discount, p.discount_type)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {p.expires_at ? new Date(p.expires_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                      >
                        {p.active ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
                          disabled={toggleMutation.isPending}
                          className="rounded-md bg-background px-2 py-1 text-xs disabled:opacity-60"
                        >
                          {p.active ? "Ngừng" : "Kích hoạt"}
                        </button>
                        <button
                          onClick={() => setEditing(p)}
                          aria-label="Sửa mã ưu đãi"
                          className="grid h-7 w-7 place-items-center rounded-md bg-background"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          aria-label="Xoá mã ưu đãi"
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
        <PromotionFormModal
          promotion={editing === "new" ? null : editing}
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
            <div className="text-base font-black">Xoá mã "{deleting.code}"?</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Hành động này không thể hoàn tác. Lịch sử chuyến đã dùng mã này vẫn giữ nguyên, chỉ mã
              ưu đãi bị xoá.
            </p>
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

// Form tạo mới/sửa mã ưu đãi — cùng 1 form, `promotion` null nghĩa là tạo mới.
function PromotionFormModal({
  promotion,
  onClose,
  onSaved,
}: {
  promotion: PromotionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(promotion?.code ?? "");
  const [title, setTitle] = useState(promotion?.title ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(
    promotion?.discount_type ?? "fixed",
  );
  const [discount, setDiscount] = useState(promotion ? String(promotion.discount) : "");
  const [expiresAt, setExpiresAt] = useState(promotion?.expires_at ?? "");
  const [saving, setSaving] = useState(false);

  const discountNum = Number(discount);
  const isValid =
    code.trim().length >= 3 &&
    title.trim().length > 0 &&
    discountNum > 0 &&
    (discountType !== "percent" || discountNum <= 100);

  const submit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    const input: PromotionInput = {
      code,
      title,
      description: description.trim() || null,
      discount: discountNum,
      discountType,
      expiresAt: expiresAt || null,
    };
    try {
      if (promotion) {
        await updatePromotion(promotion.id, input);
        toast.success("Đã cập nhật mã ưu đãi");
      } else {
        await createPromotion(input);
        toast.success("Đã tạo mã ưu đãi mới");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được mã ưu đãi.");
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
            {promotion ? "Sửa mã ưu đãi" : "Tạo mã ưu đãi mới"}
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
            <span className="text-xs font-semibold text-muted-foreground">Mã (vd. GIAM20K)</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="GIAM20K"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Tiêu đề</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Giảm 20.000đ chuyến đầu tiên"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">
              Mô tả (không bắt buộc)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Áp dụng cho chuyến đầu tiên trong ngày"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-muted-foreground">Kiểu giảm</span>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setDiscountType("fixed")}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-bold transition",
                  discountType === "fixed" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                Số tiền (VNĐ)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("percent")}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-bold transition",
                  discountType === "percent" ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                Phần trăm (%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                {discountType === "percent" ? "Giảm (%)" : "Giảm (VNĐ)"}
              </span>
              <input
                value={discount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  const num = digits === "" ? "" : String(Number(digits));
                  setDiscount(
                    discountType === "percent" && num !== ""
                      ? String(Math.min(100, Number(num)))
                      : num,
                  );
                }}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={discountType === "percent" ? "30" : "20000"}
              />
              {discountType === "percent" && (
                <span className="mt-1 block text-[11px] text-muted-foreground">Tối đa 100%</span>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">
                Hết hạn (không bắt buộc)
              </span>
              <input
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                type="date"
                className="mt-1 w-full rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!isValid || saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {promotion ? "Lưu thay đổi" : "Tạo mã"}
        </button>
      </div>
    </div>
  );
}

// Ô ảnh banner riêng cho từng dòng: có ảnh thì hiện thumbnail + nút đổi/xoá,
// chưa có thì hiện nút tải ảnh lên. Input file ẩn, bấm nút mới mở hộp chọn file.
function BannerImageCell({
  promotion,
  onChanged,
}: {
  promotion: PromotionRow;
  onChanged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await uploadPromotionBanner(promotion.id, file);
      toast.success("Đã tải ảnh banner");
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
      await removePromotionBanner(promotion.id);
      toast.success("Đã xoá ảnh banner");
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
      {promotion.image_url ? (
        <>
          <img
            src={promotion.image_url}
            alt={promotion.title}
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
            aria-label="Xoá ảnh banner"
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
