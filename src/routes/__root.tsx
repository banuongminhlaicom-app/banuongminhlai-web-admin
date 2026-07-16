import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useTheme } from "../hooks/use-theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary text-3xl font-black">
          404
        </div>
        <h2 className="text-xl font-bold">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã được chuyển.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div>
        <h1 className="text-xl font-bold">Có lỗi xảy ra</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vui lòng thử lại hoặc quay về trang chủ.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Thử lại
          </button>
          <a
            href="/"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Trang chủ
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0a0b" },
      { title: "Bạn Uống Mình Lái — Tài xế lái xe hộ tại Cao Lãnh" },
      {
        name: "description",
        content:
          "Dịch vụ tài xế lái xe hộ tận nơi. An toàn cho bạn, trọn vẹn cuộc vui. Đặt tài xế ngay tại Cao Lãnh, Đồng Tháp.",
      },
      { property: "og:title", content: "Bạn Uống Mình Lái — Tài xế lái xe hộ" },
      {
        property: "og:description",
        content:
          "Bạn cứ vui, việc lái xe để chúng tôi lo. Tài xế đến đón và đưa bạn cùng xe về nhà an toàn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { theme } = useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme={theme} position="top-center" richColors />
    </QueryClientProvider>
  );
}
