import { useEffect, useState } from "react";
import { LocateFixed, X } from "lucide-react";
import { getCurrentPosition } from "@/lib/places";
import { cn } from "@/lib/utils";

type PermState = "checking" | "granted" | "prompt" | "denied";

const DISMISS_KEY = "buml-location-card-dismissed";

/**
 * Thẻ mời bật định vị, hiện khi vào app nếu người dùng chưa cấp quyền.
 *
 * Cố ý KHÔNG bật thẳng hộp thoại trình duyệt lúc vừa vào app: người dùng chưa
 * hiểu vì sao bị hỏi thường bấm "Chặn" theo phản xạ, mà một khi đã chặn thì
 * phải vào cài đặt trình duyệt mới mở lại được (rất nhiều người không biết
 * cách). Nên giải thích lợi ích trước, bấm nút mới gọi hộp thoại thật.
 */
export function LocationPermissionCard({
  role,
  className,
}: {
  role: "customer" | "driver";
  className?: string;
}) {
  const [state, setState] = useState<PermState>("checking");
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }
    if (!navigator.geolocation) {
      setState("denied");
      return;
    }
    // Permissions API cho biết trạng thái mà KHÔNG kích hoạt hộp thoại — nhờ
    // vậy người đã cấp quyền không bị làm phiền lần nữa.
    if (!navigator.permissions?.query) {
      setState("prompt");
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        setState(status.state as PermState);
        status.onchange = () => setState(status.state as PermState);
      })
      .catch(() => setState("prompt"));
  }, []);

  const request = async () => {
    setRequesting(true);
    try {
      await getCurrentPosition();
      setState("granted");
    } catch {
      // Người dùng bấm Chặn, hoặc thiết bị không lấy được vị trí.
      setState("denied");
    } finally {
      setRequesting(false);
    }
  };

  const hide = () => {
    setDismissed(true);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(DISMISS_KEY, "1");
  };

  if (dismissed || state === "checking" || state === "granted") return null;

  const isDenied = state === "denied";

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border p-3.5",
        isDenied ? "border-warning/40 bg-warning/10" : "border-primary/30 bg-primary/10",
        className,
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          isDenied ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary",
        )}
      >
        <LocateFixed className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">
          {isDenied ? "Định vị đang bị chặn" : "Bật định vị để chính xác hơn"}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isDenied
            ? "Hãy vào cài đặt trình duyệt, mục quyền truy cập vị trí của trang này và chọn Cho phép, sau đó tải lại trang."
            : role === "driver"
              ? "Khách hàng sẽ thấy bạn đang di chuyển tới đón, và hệ thống ưu tiên ghép chuyến gần bạn hơn."
              : "Tự điền đúng điểm đón hiện tại và tính giá theo quãng đường thật, không phải nhập tay."}
        </p>

        {!isDenied && (
          <button
            onClick={request}
            disabled={requesting}
            className="mt-2 rounded-xl gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {requesting ? "Đang lấy vị trí…" : "Bật định vị"}
          </button>
        )}
      </div>

      <button
        onClick={hide}
        aria-label="Đóng"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-background/60"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
