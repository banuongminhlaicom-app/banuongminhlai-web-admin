import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/onboarding" }), 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-between bg-background px-8 py-16 gradient-hero">
      <div />
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-700">
        <BrandLogo size="lg" showText={false} />
        <div>
          <div className="text-3xl font-black tracking-tight">BẠN UỐNG</div>
          <div className="text-3xl font-black tracking-tight text-primary">MÌNH LÁI</div>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">An toàn cho bạn – Trọn vẹn cuộc vui</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse gradient-primary" />
        </div>
        <Link to="/onboarding" className="text-xs text-muted-foreground">Bỏ qua</Link>
      </div>
    </div>
  );
}
