import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Điều khoản sử dụng" }] }),
  component: Terms,
});

function Terms() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background px-5 pb-10">
      <div className="safe-top flex items-center gap-3 py-3">
        <button onClick={() => history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-black">Điều khoản sử dụng</h1>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>Bạn Uống Mình Lái là dịch vụ tài xế lái xe hộ, cung cấp tài xế chuyên nghiệp đến vị trí của khách hàng và sử dụng chính phương tiện của khách để đưa khách về nhà an toàn.</p>
        <p><strong className="text-foreground">1. Đăng ký tài khoản.</strong> Khách hàng đăng ký bằng số điện thoại và xác thực OTP. Mỗi số điện thoại chỉ được tạo một tài khoản.</p>
        <p><strong className="text-foreground">2. Trách nhiệm khách hàng.</strong> Cung cấp thông tin chính xác về phương tiện và đảm bảo xe trong tình trạng có thể vận hành hợp pháp.</p>
        <p><strong className="text-foreground">3. Bảo hiểm.</strong> Trong thời gian tài xế điều khiển phương tiện, chúng tôi cam kết hỗ trợ theo quy định bảo hiểm hiện hành.</p>
        <p><strong className="text-foreground">4. Thanh toán.</strong> Khách hàng thanh toán sau chuyến đi bằng tiền mặt, chuyển khoản QR hoặc ví liên kết.</p>
        <p><strong className="text-foreground">5. Hủy chuyến.</strong> Khách có thể hủy trước khi tài xế đến. Phí hủy có thể áp dụng nếu tài xế đã tới điểm đón.</p>
      </div>
    </div>
  );
}
