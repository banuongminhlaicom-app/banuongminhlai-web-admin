import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  CalendarClock,
  ChevronRight,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Gift,
  Home as HomeIcon,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Siren,
  Sun,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { BrandLogo } from "@/components/BrandLogo";
import { EmergencyButton } from "@/components/EmergencyButton";
import { LocationPermissionCard } from "@/components/LocationPermissionCard";
import { useAuthState, useRequireRole } from "@/lib/auth";
import {
  getActiveCustomerTrip,
  getAddresses,
  getLoyaltyPoints,
  getMostRecentCompletedTrip,
  getPartnerVenues,
  getPromotions,
  type AddressRow,
  type PartnerVenueRow,
  type PromotionRow,
  type TripRow,
  type TripStatusDb,
} from "@/lib/queries";
import { getCurrentPosition } from "@/lib/places";
import { fetchCurrentWeather, weatherKindFromCode, type WeatherKind } from "@/lib/weather";
import { cn } from "@/lib/utils";

// Kéo bằng chuột để cuộn ngang — vuốt cảm ứng thật trên điện thoại đã tự chạy
// sẵn (overflow-x-auto), nhưng test bằng chuột trên desktop (không có
// touchpad 2 ngón) thì không có cách nào cuộn ngang vì đã ẩn thanh cuộn.
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const state = useRef({ down: false, startX: 0, scrollLeft: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    state.current = { down: true, startX: e.pageX, scrollLeft: el.scrollLeft };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !state.current.down) return;
    e.preventDefault();
    el.scrollLeft = state.current.scrollLeft - (e.pageX - state.current.startX);
  };
  const stopDrag = () => {
    state.current.down = false;
  };
  return { onMouseDown, onMouseMove, onMouseUp: stopDrag, onMouseLeave: stopDrag };
}

const ACTIVE_TRIP_STATUS_LABEL: Partial<Record<TripStatusDb, string>> = {
  searching: "Đang tìm tài xế…",
  accepted: "Tài xế đã nhận chuyến",
  arriving: "Tài xế đang tới đón bạn",
  arrived: "Tài xế đã tới điểm đón",
  in_progress: "Đang trên đường tới",
};

const WEATHER_ICON: Record<WeatherKind, typeof Sun> = {
  clear: Sun,
  cloudy: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  storm: CloudLightning,
};

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Trang chủ — Bạn Uống Mình Lái" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  useRequireRole("customer");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const authState = useAuthState();
  const userId = authState.session?.user.id;
  const greetingName = authState.profile?.full_name?.trim() || "bạn";

  // Vị trí GPS thật của khách — dùng để lấy thời tiết theo đúng khu vực. CHỈ tự
  // lấy khi quyền đã được cấp sẵn từ trước (hoặc vừa được cấp qua nút "Bật
  // định vị" của LocationPermissionCard) — không tự ý bật thẳng hộp thoại xin
  // quyền ngay lúc vào Home, giữ đúng chủ đích đã có sẵn ở LocationPermissionCard
  // (mời trước, không dí hộp thoại thật ngay từ đầu).
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    const fetchCoord = () => {
      getCurrentPosition()
        .then((c) => {
          if (!cancelled) setCoord(c);
        })
        .catch(() => {});
    };
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (status.state === "granted") fetchCoord();
        status.onchange = () => {
          if (status.state === "granted") fetchCoord();
        };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => getAddresses(userId!),
    enabled: !!userId,
  });

  const { data: points } = useQuery({
    queryKey: ["loyalty-points", userId],
    queryFn: () => getLoyaltyPoints(userId!),
    enabled: !!userId,
  });

  const { data: weather } = useQuery({
    queryKey: ["weather", coord?.lat, coord?.lng],
    queryFn: () => fetchCurrentWeather(coord!),
    enabled: !!coord,
    staleTime: 20 * 60 * 1000,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions-active"],
    queryFn: getPromotions,
    staleTime: 5 * 60 * 1000,
  });
  const activePromotions = promotions.filter(
    (p) => p.active && (!p.expires_at || new Date(p.expires_at) > new Date()),
  );

  // Chuyến đang hoạt động (chưa hoàn thành/huỷ) — để khách quay lại Home giữa
  // chừng vẫn thấy và bấm vào tiếp tục theo dõi, không bị "mất dấu" chuyến.
  const { data: activeTrip } = useQuery({
    queryKey: ["active-trip", userId],
    queryFn: () => getActiveCustomerTrip(userId!),
    enabled: !!userId,
    refetchInterval: 8000,
  });

  // Địa điểm đối tác (nhà hàng, quán ăn...) trả phí quảng cáo (admin.venues.tsx quản lý).
  const { data: partnerVenues = [] } = useQuery({
    queryKey: ["partner-venues"],
    queryFn: getPartnerVenues,
    staleTime: 5 * 60 * 1000,
  });

  // Chuyến gần nhất đã hoàn thành — để đặt lại nhanh cùng tuyến.
  const { data: recentTrip } = useQuery({
    queryKey: ["recent-completed-trip", userId],
    queryFn: () => getMostRecentCompletedTrip(userId!),
    enabled: !!userId,
  });

  const goBook = (to: "/booking" | "/schedule") => {
    if (to === "/booking") setLoading(true);
    setTimeout(() => navigate({ to }), to === "/booking" ? 350 : 0);
  };

  const goBookToVenue = (venue: PartnerVenueRow) => {
    setLoading(true);
    setTimeout(
      () =>
        navigate({
          to: "/booking",
          search: { dropoffAddress: venue.address, dropoffLat: venue.lat, dropoffLng: venue.lng },
        }),
      350,
    );
  };

  const goRebookTrip = (trip: TripRow) => {
    setLoading(true);
    setTimeout(
      () =>
        navigate({
          to: "/booking",
          search: {
            pickupAddress: trip.pickup_address,
            pickupLat: trip.pickup_lat ?? undefined,
            pickupLng: trip.pickup_lng ?? undefined,
            dropoffAddress: trip.dropoff_address,
            dropoffLat: trip.dropoff_lat ?? undefined,
            dropoffLng: trip.dropoff_lng ?? undefined,
          },
        }),
      350,
    );
  };

  const homeAddress = savedAddresses.find((a) => /nhà|home/i.test(a.label));
  const workAddress = savedAddresses.find((a) =>
    /công ty|cty|văn phòng|office|work/i.test(a.label),
  );
  const WeatherIcon = weather ? WEATHER_ICON[weatherKindFromCode(weather.weatherCode)] : null;

  const venuesScrollRef = useRef<HTMLDivElement>(null);
  const venuesDrag = useDragScroll(venuesScrollRef);

  return (
    <MobileShell>
      {/* ===== 1. Header & lời chào ===== */}
      <header className="safe-top px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] text-muted-foreground">Xin chào</div>
            <div className="truncate text-[18px] font-black leading-tight">{greetingName}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {WeatherIcon && weather && (
              <div className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-2 text-[12px] font-bold shadow-elevated">
                <WeatherIcon className="h-4 w-4 text-primary" />
                {weather.temperatureC}°C
              </div>
            )}
            <Link
              to="/rewards"
              className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-2 text-[12px] font-bold text-warning shadow-elevated"
            >
              <Gift className="h-4 w-4" />
              {points?.balance ?? 0} điểm
            </Link>
            <button
              onClick={() => navigate({ to: "/notifications" })}
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface shadow-elevated"
              aria-label="Thông báo"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
          </div>
        </div>
      </header>

      {/* Mời bật định vị nếu chưa cấp quyền — tự ẩn khi đã cho phép. */}
      <div className="px-4 pb-1">
        <LocationPermissionCard role="customer" />
      </div>

      {/* Chuyến đang hoạt động — nổi bật ngay đầu trang để khách không mất dấu
          chuyến khi lỡ bấm về Home giữa lúc đang chờ/đang đi. */}
      {activeTrip && (
        <div className="px-4 pb-2 pt-1">
          <button
            onClick={() => navigate({ to: "/booking/$id", params: { id: activeTrip.id } })}
            className="flex w-full items-center gap-3 rounded-2xl gradient-primary p-3.5 text-left text-primary-foreground shadow-glow"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
              <Navigation className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-90">
                {ACTIVE_TRIP_STATUS_LABEL[activeTrip.status] ?? "Chuyến đang hoạt động"}
              </span>
              <span className="block truncate text-[13px] font-bold">
                {activeTrip.dropoff_address}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-90" />
          </button>
        </div>
      )}

      {/* ===== 2. Khung tìm kiếm tuyến đường ===== */}
      <section className="px-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goBook("/booking")}
            disabled={loading}
            className="flex flex-1 items-center gap-2.5 rounded-2xl bg-surface px-4 py-3.5 text-left shadow-elevated ring-1 ring-border transition active:scale-[.99] disabled:opacity-90"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : (
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-[14px] font-semibold text-muted-foreground">
              Bạn muốn về đâu?
            </span>
          </button>
          <button
            onClick={() => goBook("/schedule")}
            className="flex shrink-0 items-center gap-1.5 rounded-2xl gradient-primary px-4 py-3.5 text-[13px] font-bold text-primary-foreground shadow-glow transition active:scale-[.97]"
          >
            <CalendarClock className="h-4 w-4" /> Đặt lịch
          </button>
        </div>

        {/* Phím tắt địa điểm đã lưu — cuộn ngang */}
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          <AddressShortcut
            icon={HomeIcon}
            saved={homeAddress}
            fallbackLabel="Thêm nhà"
            onClick={() => (homeAddress ? goBook("/booking") : navigate({ to: "/addresses" }))}
          />
          <AddressShortcut
            icon={Building2}
            saved={workAddress}
            fallbackLabel="Thêm công ty"
            onClick={() => (workAddress ? goBook("/booking") : navigate({ to: "/addresses" }))}
          />
          <button
            onClick={() => navigate({ to: "/addresses" })}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border bg-surface/60 px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm địa điểm
          </button>
        </div>
      </section>

      {/* ===== 3. Dịch vụ cốt lõi ===== */}
      <section className="mt-5 px-4">
        <h3 className="mb-3 text-[13px] font-black uppercase tracking-wide text-muted-foreground">
          Dịch vụ Bạn Uống Mình Lái
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <ServiceTile
            iconSrc="/icons/service-car.png"
            label="Tài xế xe ô tô"
            onClick={() => goBook("/booking")}
          />
          <ServiceTile
            iconSrc="/icons/service-scooter.png"
            label="Tài xế xe máy"
            onClick={() => goBook("/booking")}
          />
          <ServiceTile
            iconSrc="/icons/service-moto.png"
            label="Xe ôm công nghệ"
            comingSoon
            onClick={() => toast("Xe ôm công nghệ sắp ra mắt")}
          />
        </div>
      </section>

      {/* ===== 4. Quảng cáo & Ưu đãi ===== */}
      {activePromotions.length > 0 && <PromotionsCarousel promotions={activePromotions} />}

      {/* ===== Tiện ích & giữ chân ===== */}

      {/* Nhắc mức phạt nồng độ cồn — kích thích đặt xe ngay. Nội dung tĩnh vì
          mức phạt là thông tin pháp luật, không nên tự đổi theo dữ liệu động. */}
      <section className="mt-5 px-4">
        <button
          onClick={() => goBook("/booking")}
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 p-4 text-left text-white shadow-elevated transition active:scale-[.98]"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <Siren className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-black leading-snug">
              Mức phạt nồng độ cồn hôm nay: Xe máy lên tới 8 triệu, Ô tô lên tới 40 triệu.
            </div>
            <div className="mt-0.5 text-[12px] font-bold text-white/90">Gọi tài xế chỉ 150k!</div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
        </button>
      </section>

      {/* Địa điểm gần bạn — quán đối tác trả phí quảng cáo, quản lý qua
          admin.venues.tsx. Bấm vào tự điền địa điểm đó làm điểm đến. */}
      {partnerVenues.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-3 px-4 text-[15px] font-black">Địa điểm gần bạn</h3>
          <div
            ref={venuesScrollRef}
            {...venuesDrag}
            className="flex cursor-grab gap-3 overflow-x-auto px-4 pb-1 no-scrollbar active:cursor-grabbing"
          >
            {partnerVenues.map((v) => (
              <button
                key={v.id}
                onClick={() => goBookToVenue(v)}
                className="w-[150px] shrink-0 overflow-hidden rounded-2xl bg-surface text-left shadow-elevated ring-1 ring-border transition active:scale-[.97]"
              >
                {v.image_url ? (
                  <img
                    src={v.image_url}
                    alt={v.name}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-24 w-full place-items-center bg-gradient-to-br from-primary/20 to-warning/20">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="p-2.5">
                  <div className="truncate text-[13px] font-bold">{v.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {v.address}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Cuốc xe gần nhất — đặt lại nhanh cùng tuyến vừa đi. */}
      {recentTrip && (
        <section className="mt-5 px-4">
          <h3 className="mb-3 text-[15px] font-black">Cuốc xe gần nhất</h3>
          <button
            onClick={() => goRebookTrip(recentTrip)}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left shadow-elevated ring-1 ring-border transition active:scale-[.98]"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{recentTrip.dropoff_address}</div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Từ: {recentTrip.pickup_address}
              </div>
            </div>
            <span className="shrink-0 text-[12px] font-bold text-primary">Đặt lại</span>
          </button>
        </section>
      )}

      {/* ===== 5. Banner thương hiệu Bạn Uống Mình Lái ===== */}
      <section className="mt-5 px-4">
        <div className="flex items-center gap-3 overflow-hidden rounded-2xl gradient-hero p-3.5 shadow-elevated">
          <BrandLogo size="sm" showText={false} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-black leading-tight">
              Chở trọn <span className="text-primary">NIỀM TIN</span>
            </div>
          </div>
          <button
            onClick={() => goBook("/booking")}
            className="flex shrink-0 items-center gap-1 rounded-full gradient-primary px-3.5 py-2 text-[12px] font-bold text-primary-foreground shadow-glow transition active:scale-[.97]"
          >
            Đặt xe <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <EmergencyButton />
    </MobileShell>
  );
}

// Phím tắt "Nhà"/"Công ty": đã lưu thì hiện đúng địa chỉ, chưa có thì hiện nút
// "Thêm..." mời khách lưu lần đầu (giống Grab).
function AddressShortcut({
  icon: Icon,
  saved,
  fallbackLabel,
  onClick,
}: {
  icon: typeof HomeIcon;
  saved?: AddressRow;
  fallbackLabel: string;
  onClick: () => void;
}) {
  if (!saved) {
    return (
      <button
        onClick={onClick}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border bg-surface/60 px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> {fallbackLabel}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 max-w-[220px] items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[12.5px] font-semibold shadow-elevated ring-1 ring-border"
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="truncate">{saved.label}</span>
    </button>
  );
}

// Ảnh minh hoạ cảnh (cắt từ mockup bạn cung cấp, đã xoá phần đè lên của badge
// "Sắp ra mắt") — chi tiết hơn hẳn icon tròn nhỏ trước đây nên hiện gần trọn
// bề rộng thẻ (aspect-square + object-cover) thay vì bó vào 1 vòng tròn nhỏ.
function ServiceTile({
  iconSrc,
  label,
  comingSoon,
  onClick,
}: {
  iconSrc: string;
  label: string;
  comingSoon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 rounded-2xl bg-surface p-2.5 text-center shadow-elevated ring-1 ring-border transition active:scale-[.97]"
    >
      {comingSoon && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
          Sắp ra mắt
        </span>
      )}
      <div className="aspect-square w-full overflow-hidden rounded-xl">
        <img src={iconSrc} alt={label} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <span className="text-[12px] font-bold leading-tight">{label}</span>
    </button>
  );
}

// Chưa up ảnh cho mã nào thì rơi về nền gradient bo góc + chữ — vẫn đủ vai
// trò 1 banner, không vỡ giao diện trong lúc chờ admin tải ảnh thật lên.
const PROMO_GRADIENTS = [
  "gradient-primary",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-indigo-500 to-purple-600",
  "bg-gradient-to-br from-amber-500 to-orange-600",
];

// Carousel kiểu "peek" (hở mép thẻ kế bên, kiểu Mioto/MiCarro) — hở nhiều hơn
// bản cũ (68% thay vì 85%) và không dùng chấm phân trang, khớp ảnh mẫu bạn gửi.
function PromotionsCarousel({ promotions }: { promotions: PromotionRow[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useDragScroll(scrollerRef);

  return (
    <section className="mt-5">
      <h3 className="mb-3 px-4 text-[15px] font-black">Chương trình khuyến mãi</h3>
      <div
        ref={scrollerRef}
        {...drag}
        className="flex cursor-grab snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-1 no-scrollbar active:cursor-grabbing"
      >
        {promotions.map((p, i) => (
          <div
            key={p.id}
            className="relative aspect-[3/2] w-[68%] shrink-0 snap-start overflow-hidden rounded-2xl shadow-elevated"
          >
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className={cn(
                  "flex h-full w-full flex-col justify-between p-4 text-white",
                  PROMO_GRADIENTS[i % PROMO_GRADIENTS.length],
                )}
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                    Ưu đãi
                  </div>
                  <div className="mt-1 text-base font-black leading-tight text-balance">
                    {p.title}
                  </div>
                </div>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                  Mã: {p.code}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
