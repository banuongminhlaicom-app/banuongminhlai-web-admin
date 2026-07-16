import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Beer, Car, Home } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const SLIDES = [
  {
    Icon: Beer,
    title: "Tận hưởng cuộc vui an toàn",
    desc: "Cứ vui trọn vẹn cùng bạn bè. Việc lái xe hãy để chúng tôi lo.",
  },
  {
    Icon: Car,
    title: "Tài xế đến tận nơi",
    desc: "Tài xế chuyên nghiệp sẽ tới đón bạn chỉ trong vài phút.",
  },
  {
    Icon: Home,
    title: "Đưa bạn và xe về nhà",
    desc: "Tài xế lái chính xe của bạn, đưa cả người và xe về an toàn.",
  },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const slide = SLIDES[i];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pb-10 pt-8 gradient-hero">
      <div className="flex items-center justify-between">
        <BrandLogo size="sm" />
        <Link to="/login" className="text-sm text-muted-foreground">
          Bỏ qua
        </Link>
      </div>

      <div className="my-10 flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="grid h-40 w-40 place-items-center rounded-[2.5rem] gradient-primary shadow-glow">
          <slide.Icon className="h-20 w-20 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-black">{slide.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{slide.desc}</p>
        </div>
        <div className="flex gap-2">
          {SLIDES.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-primary" : "w-2 bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => (i < SLIDES.length - 1 ? setI(i + 1) : navigate({ to: "/login" }))}
          className="rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow active:scale-[.98] transition"
        >
          {i < SLIDES.length - 1 ? "Tiếp tục" : "Bắt đầu"}
        </button>
        <Link to="/login" className="text-center text-sm text-muted-foreground">
          Đã có tài khoản? <span className="font-semibold text-foreground">Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}
