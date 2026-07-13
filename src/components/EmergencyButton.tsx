import { Phone } from "lucide-react";
import { toast } from "sonner";

export function EmergencyButton() {
  return (
    <button
      onClick={() =>
        toast("Đang kết nối 113", {
          description: "Trong bản chính thức nút này gọi trực tiếp đến hotline khẩn cấp.",
        })
      }
      className="fixed bottom-32 right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-glow ring-4 ring-background"
      aria-label="Hỗ trợ khẩn cấp"
    >
      <Phone className="h-5 w-5" />
    </button>
  );
}
