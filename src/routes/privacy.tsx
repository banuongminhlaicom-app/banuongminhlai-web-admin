import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Chính sách bảo mật" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-10">
      <div className="safe-top flex items-center gap-3 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Chính sách bảo mật</h1>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>Chúng tôi cam kết bảo vệ dữ liệu cá nhân theo Luật Bảo vệ dữ liệu cá nhân của Việt Nam.</p>
        <p><strong className="text-foreground">Thông tin thu thập:</strong> họ tên, số điện thoại, vị trí, phương tiện, hành trình.</p>
        <p><strong className="text-foreground">Mục đích:</strong> điều phối tài xế, đảm bảo an toàn chuyến đi và cải thiện dịch vụ.</p>
        <p><strong className="text-foreground">Chia sẻ:</strong> chỉ chia sẻ thông tin cần thiết với tài xế nhận chuyến và cơ quan chức năng khi có yêu cầu hợp pháp.</p>
        <p><strong className="text-foreground">Quyền của bạn:</strong> yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu cá nhân bằng cách liên hệ tổng đài.</p>
      </div>
    </div>
  );
}
