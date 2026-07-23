import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { MapPreview } from "@/components/MapPreview";
import {
  computeBearing,
  decodePolyline,
  isGoongMapConfigured,
  loadGoongMapSdk,
  MAP_STYLE,
  type GoongMapInstance,
  type GoongMarker,
} from "@/lib/goong-map";
import { cn } from "@/lib/utils";

export interface Coord {
  lat: number;
  lng: number;
}

// Tạo phần tử DOM cho marker tài xế: vòng tròn xanh dương + mũi tên trắng chỉ
// hướng đi. Trả về cả `inner` để component xoay theo bearing bằng CSS transform
// (mapbox/goong quản lý transform của `wrap` để đặt vị trí, nên phải xoay lớp
// con để không bị ghi đè).
function makeDriverArrowEl() {
  const wrap = document.createElement("div");
  wrap.style.width = "42px";
  wrap.style.height = "42px";
  wrap.style.pointerEvents = "none";
  const inner = document.createElement("div");
  inner.style.width = "100%";
  inner.style.height = "100%";
  inner.style.transition = "transform 300ms ease-out";
  inner.innerHTML =
    '<svg viewBox="0 0 42 42" width="42" height="42" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="21" cy="21" r="15" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>' +
    '<path d="M21 12 L29 27 L21 22.5 L13 27 Z" fill="#ffffff"/>' +
    "</svg>";
  wrap.appendChild(inner);
  return { wrap, inner };
}

// Hướng "phía trước" theo tuyến đường: đi dọc polyline (bắt đầu ~ vị trí tài
// xế) tới khi tích luỹ ~60m rồi lấy bearing tới điểm đó. Dùng để xoay bản đồ
// theo hướng đi ngay cả khi tài xế đang đứng yên (chưa có heading từ GPS).
function forwardBearingFromRoute(driver: Coord, routePolyline: string): number | null {
  const pts = decodePolyline(routePolyline); // [lng, lat][]
  if (pts.length < 2) return null;
  const distM = (a: Coord, b: Coord) => {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  };
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const b: Coord = { lat: pts[i][1], lng: pts[i][0] };
    acc += distM({ lat: pts[i - 1][1], lng: pts[i - 1][0] }, b);
    if (acc >= 60) return computeBearing(driver, b);
  }
  const last = pts[pts.length - 1];
  return computeBearing(driver, { lat: last[1], lng: last[0] });
}

// Bản đồ Goong tương tác: marker điểm đón/đến, marker xe tài xế (realtime),
// vẽ tuyến đường. Nếu chưa cấu hình Maptiles key thì rơi về MapPreview (ảnh
// bản đồ tĩnh cũ) — giao diện không vỡ, luồng đặt xe vẫn chạy như trước.
export function GoongMap({
  className,
  pickup,
  dropoff,
  driver,
  routePolyline,
  navigate,
  fallbackProps,
}: {
  className?: string;
  pickup?: Coord | null;
  dropoff?: Coord | null;
  driver?: Coord | null;
  routePolyline?: string | null;
  // Chế độ dẫn đường: camera rọi thẳng từ trên xuống (top-down) + xoay theo
  // hướng xe chạy (bearing), bám sát vị trí tài xế thay vì canh khung ôm trọn.
  navigate?: boolean;
  fallbackProps?: { showRoute?: boolean; driverPin?: boolean; showNearbyDrivers?: boolean };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoongMapInstance | null>(null);
  const markersRef = useRef<Record<string, GoongMarker>>({});
  const readyRef = useRef(false);
  const prevDriverRef = useRef<Coord | null>(null);
  const bearingRef = useRef(0);
  // Đã có hướng thật từ GPS chuyển động chưa. Trước khi có, xoay bản đồ theo
  // hướng tuyến đường phía trước để không bị kẹt hướng Bắc lúc đứng yên.
  const hasHeadingRef = useRef(false);
  // Phần tử bên trong marker tài xế — xoay riêng bằng CSS transform theo hướng
  // đi (bearing), không phụ thuộc SDK có hỗ trợ setRotation hay không.
  const driverArrowRef = useRef<HTMLDivElement | null>(null);

  // Chế độ dẫn đường: camera tự bám vị trí xe (mặc định) cho tới khi người
  // dùng tự kéo/vuốt bản đồ — lúc đó ngừng bám để họ xem tự do, nút định vị
  // chuyển màu xám; bấm nút sẽ khoá camera trở lại vị trí xe.
  const [autoTracking, setAutoTracking] = useState(true);
  useEffect(() => {
    if (navigate) setAutoTracking(true);
  }, [navigate]);

  // Mọi callback của bản đồ ("load", "dragstart") được đăng ký MỘT LẦN lúc dựng
  // map, nên nếu đọc props trực tiếp chúng sẽ mãi thấy giá trị của lần render
  // đầu tiên. Lần render đầu `navigate` luôn là false (driverStatus chưa kịp về
  // từ useQuery), khiến callback "load" chạy nhánh fitBounds và ép camera về
  // góc phẳng — đúng lỗi bản đồ không nghiêng 3D. Đọc qua ref để luôn lấy giá
  // trị mới nhất.
  const propsRef = useRef({ pickup, dropoff, driver, routePolyline, navigate, autoTracking });
  propsRef.current = { pickup, dropoff, driver, routePolyline, navigate, autoTracking };

  // Khởi tạo bản đồ 1 lần.
  useEffect(() => {
    if (!isGoongMapConfigured || !containerRef.current) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    loadGoongMapSdk()
      .then((goongjs) => {
        if (disposed || !containerRef.current) return;
        // Đọc từ ref: SDK tải bất đồng bộ nên tới đây `navigate` có thể đã bật
        // (driverStatus vừa về) dù lúc mount còn tắt.
        const p = propsRef.current;
        const center = p.driver ?? p.pickup ?? p.dropoff ?? { lat: 10.457, lng: 105.634 };
        // Chế độ dẫn đường: góc nhìn rọi thẳng từ trên xuống (top-down, pitch 0),
        // cận cảnh và xoay theo hướng đi — KHÔNG nghiêng 3D.
        const map = new goongjs.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: [center.lng, center.lat],
          zoom: p.navigate ? 18 : 14,
          pitch: 0,
        });
        map.on("load", () => {
          readyRef.current = true;
          syncMap(goongjs, map);
        });
        // Chỉ dùng "dragstart" để phát hiện thao tác tự do của người dùng —
        // sự kiện này CHỈ bắn khi người dùng thật sự kéo bản đồ, không bao giờ
        // bắn do code tự gọi easeTo/flyTo. Từng thử thêm zoomstart/rotatestart
        // (lọc qua originalEvent) nhưng chính easeTo tự động của auto-tracking
        // cũng có thể kích hoạt các sự kiện đó, tự tắt auto-tracking ngoài ý
        // muốn rồi làm camera đứng yên ở góc phẳng — bỏ hẳn cho chắc.
        map.on("dragstart", () => setAutoTracking(false));
        mapRef.current = map;

        // Bản đồ khởi tạo với canvas nhỏ mặc định nếu container chưa có kích
        // thước thật lúc đó (CSS của goong-js.css tải bất đồng bộ, chưa kịp
        // load xong khi Map() dựng canvas; hoặc trình duyệt di động đổi lại
        // đơn vị vh khi thanh địa chỉ ẩn/hiện). ResizeObserver theo dõi khung
        // chứa thật, gọi resize() lại mỗi khi kích thước đổi — vá đúng lỗi bản
        // đồ bị co nhỏ lại, còn lại khoảng trắng/xám phía dưới.
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => map.resize());
          resizeObserver.observe(containerRef.current);
        }
      })
      .catch(() => {
        // Không tải được SDK — giữ nguyên khung trống, fallback bên dưới lo phần hiển thị.
      });

    return () => {
      disposed = true;
      readyRef.current = false;
      resizeObserver?.disconnect();
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Chỉ dựng bản đồ 1 lần; mọi cập nhật sau đó do effect bên dưới xử lý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cập nhật marker + tuyến đường mỗi khi toạ độ đổi (vd. xe tài xế di chuyển).
  // Bản đồ chưa dựng/chưa load xong thì bỏ qua an toàn: callback "load" ở trên
  // sẽ tự sync bằng props mới nhất trong ref.
  useEffect(() => {
    const map = mapRef.current;
    const g = window.goongjs;
    if (!map || !g || !readyRef.current) return;
    syncMap(g, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup?.lat,
    pickup?.lng,
    dropoff?.lat,
    dropoff?.lng,
    driver?.lat,
    driver?.lng,
    routePolyline,
    navigate,
    autoTracking,
  ]);

  // Đưa camera vào chế độ dẫn đường (rọi thẳng từ trên xuống, cận cảnh, xoay
  // theo hướng đi) ngay khi navigate bật. Tách riêng khỏi effect trên vì effect
  // đó chỉ chạy lại khi toạ độ đổi: tài xế đứng yên thì driver.lat/lng đứng im,
  // nên nếu lần sync đầu lỡ nhịp (SDK còn đang tải) thì camera sẽ không vào
  // đúng zoom cận cảnh.
  useEffect(() => {
    if (!navigate) return;
    const applyNavView = () => {
      const map = mapRef.current;
      if (!map || !readyRef.current) return false;
      const p = propsRef.current;
      const focus = p.driver ?? p.pickup ?? p.dropoff;
      // Ngay khi vào chế độ dẫn đường, nếu chưa có hướng GPS thì xoay theo tuyến
      // đường phía trước để bản đồ "ngẩng" đúng hướng đi từ đầu (không chờ nhịp GPS).
      if (!hasHeadingRef.current && p.driver && p.routePolyline) {
        const fb = forwardBearingFromRoute(p.driver, p.routePolyline);
        if (fb != null) bearingRef.current = fb;
      }
      // Ép zoom cận cảnh + pitch 0 (top-down) + xoay theo hướng, bất kể có focus
      // hay chưa. Không phụ thuộc autoTracking để lúc mới vào luôn về đúng khung.
      const opts: Record<string, unknown> = {
        zoom: 18,
        pitch: 0,
        bearing: bearingRef.current,
        essential: true,
        duration: 600,
      };
      if (focus) opts.center = [focus.lng, focus.lat];
      map.easeTo(opts);
      return true;
    };
    // SDK tải bất đồng bộ: map có thể chưa được tạo/chưa "load" đúng lúc navigate
    // vừa bật. Thử ngay, nếu chưa được thì lặp lại mỗi 150ms tới khi thành công
    // (tránh lỗ hổng cũ: effect thoát sớm rồi không bao giờ chạy lại vì navigate
    // không đổi nữa, khiến camera kẹt sai khung).
    if (applyNavView()) return;
    const iv = window.setInterval(() => {
      if (applyNavView()) window.clearInterval(iv);
    }, 150);
    return () => window.clearInterval(iv);
  }, [navigate]);

  function syncMap(goongjs: NonNullable<typeof window.goongjs>, map: GoongMapInstance) {
    // Luôn đọc props qua ref — hàm này còn được gọi từ callback "load" vốn giữ
    // closure của lần render đầu tiên.
    const { pickup, dropoff, driver, routePolyline, navigate, autoTracking } = propsRef.current;

    const put = (key: string, coord: Coord | null | undefined, color: string) => {
      if (!coord) {
        markersRef.current[key]?.remove();
        delete markersRef.current[key];
        return;
      }
      const existing = markersRef.current[key];
      if (existing) {
        existing.setLngLat([coord.lng, coord.lat]);
      } else {
        markersRef.current[key] = new goongjs.Marker({ color })
          .setLngLat([coord.lng, coord.lat])
          .addTo(map);
      }
    };

    put("pickup", pickup, "#ef4444");
    put("dropoff", dropoff, "#22c55e");

    // Marker tài xế: mũi tên điều hướng xanh dương xoay theo hướng đi, thay cho
    // ghim mặc định (giống Grab/Google Maps Navigation).
    if (!driver) {
      markersRef.current.driver?.remove();
      delete markersRef.current.driver;
      driverArrowRef.current = null;
    } else if (!markersRef.current.driver) {
      const { wrap, inner } = makeDriverArrowEl();
      driverArrowRef.current = inner;
      markersRef.current.driver = new goongjs.Marker({ element: wrap })
        .setLngLat([driver.lng, driver.lat])
        .addTo(map);
    } else {
      markersRef.current.driver.setLngLat([driver.lng, driver.lat]);
    }
    // Ở chế độ dẫn đường bản đồ đã xoay theo hướng đi (heading-up), nên mũi tên
    // luôn hướng LÊN màn hình (rotate 0) — không xoay thêm kẻo bị lệch gấp đôi.
    // Ở chế độ thường (khách theo dõi, bản đồ hướng Bắc) thì mũi tên xoay theo
    // hướng xe để thể hiện chiều di chuyển.
    if (driverArrowRef.current) {
      driverArrowRef.current.style.transform = `rotate(${navigate ? 0 : bearingRef.current}deg)`;
    }

    if (routePolyline) drawRoute(map, routePolyline);

    if (navigate) {
      // Ở chế độ dẫn đường không được rơi xuống fitBounds bên dưới: fitBounds ép
      // bearing về 0 và thu nhỏ zoom (18 -> ~13.7), tức mất hướng xe và mất luôn
      // góc cận cảnh. Chưa có GPS tài xế thì tạm lấy điểm đón/đến làm tâm.
      const focus = driver ?? pickup ?? dropoff;
      if (driver) {
        // Ưu tiên hướng thật từ chuyển động GPS (đi đủ xa ~8m mới tính, tránh
        // nhiễu lúc gần như đứng yên).
        const prev = prevDriverRef.current;
        if (prev) {
          const movedM = Math.hypot(driver.lat - prev.lat, driver.lng - prev.lng) * 111_000; // ước lượng nhanh, đủ dùng để so ngưỡng
          if (movedM > 8) {
            bearingRef.current = computeBearing(prev, driver);
            prevDriverRef.current = driver;
            hasHeadingRef.current = true;
          }
        } else {
          prevDriverRef.current = driver;
        }
        // Chưa từng có hướng GPS -> xoay theo tuyến đường phía trước để bản đồ
        // vẫn "ngẩng" đúng hướng đi ngay cả khi đang đứng yên (vd. lúc mới nhận
        // chuyến, chờ đèn đỏ, hoặc test trên máy tính không di chuyển).
        if (!hasHeadingRef.current && routePolyline) {
          const fb = forwardBearingFromRoute(driver, routePolyline);
          if (fb != null) bearingRef.current = fb;
        }
      }
      // Chỉ tự kéo camera khi đang bật auto-tracking — người dùng đang xem tự
      // do (đã kéo/vuốt bản đồ) thì để yên cho tới khi họ bấm nút định vị.
      if (autoTracking && focus) {
        // Mỗi nhịp GPS: giữ top-down cận cảnh (pitch 0, zoom 18), chỉ dời tâm +
        // xoay theo hướng. essential:true để không bị bỏ qua khi giảm chuyển động.
        map.easeTo({
          center: [focus.lng, focus.lat],
          zoom: 18,
          pitch: 0,
          bearing: bearingRef.current,
          essential: true,
          duration: 900,
        });
      }
      return;
    }

    // Chế độ thường: căn khung nhìn ôm trọn các điểm đang có.
    const points = [pickup, dropoff, driver].filter((c): c is Coord => !!c);
    if (points.length >= 2) {
      const bounds = new goongjs.LngLatBounds(
        [points[0].lng, points[0].lat],
        [points[0].lng, points[0].lat],
      );
      points.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
    }
  }

  // Vẽ tuyến đường lên bản đồ. Sự kiện "load" báo bản đồ sẵn sàng nhưng style
  // có thể chưa nạp xong — addSource/addLayer lúc đó sẽ ném lỗi và tuyến không
  // hiện (đúng lỗi đã gặp ở màn tài xế). Nên kiểm tra isStyleLoaded() và hoãn
  // lại tới sự kiện "idle" nếu chưa sẵn sàng.
  function drawRoute(map: GoongMapInstance, polyline: string, attempt = 0) {
    if (!map.isStyleLoaded()) {
      // Giới hạn số lần hoãn để không lặp vô hạn nếu style hỏng hẳn.
      if (attempt < 5) map.once("idle", () => drawRoute(map, polyline, attempt + 1));
      return;
    }
    try {
      const geojson = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: decodePolyline(polyline) },
      };
      const source = map.getSource("route");
      if (source) {
        source.setData(geojson);
        return;
      }
      map.addSource("route", { type: "geojson", data: geojson });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ef4444", "line-width": 4, "line-opacity": 0.85 },
      });
    } catch (err) {
      // Không nuốt lỗi im lặng như trước — ghi log để còn chẩn đoán được.
      console.error("GoongMap: không vẽ được tuyến đường", err);
    }
  }

  // Bấm nút định vị: bay về khung dẫn đường top-down (rọi thẳng từ trên xuống,
  // cận cảnh, xoay theo hướng xe — pitch 0, KHÔNG nghiêng) rồi bật lại
  // auto-tracking. Dùng flyTo cho hiệu ứng bay mượt 1 lần.
  // - essential:true để animation không bị bỏ qua khi máy bật "giảm chuyển động".
  // - speed thay cho duration để tốc độ bay ổn định bất kể quãng cách xa/gần.
  const handleRecenter = () => {
    const map = mapRef.current;
    const p = propsRef.current;
    const pos = p.driver ?? p.pickup ?? p.dropoff;
    if (!map || !pos) return;
    map.flyTo({
      center: [pos.lng, pos.lat],
      zoom: 18,
      pitch: 0,
      bearing: bearingRef.current,
      essential: true,
      speed: 1.2,
    });
    setAutoTracking(true);
  };

  // Chưa cấu hình Maptiles key → dùng bản đồ tĩnh cũ để giao diện không trống.
  if (!isGoongMapConfigured) {
    return <MapPreview className={className} {...fallbackProps} />;
  }

  // CẤU TRÚC ỔN ĐỊNH: luôn là wrapper (nhận className vị trí/kích thước) chứa 1
  // div bản đồ cố định + nút định vị (chỉ hiện khi navigate). Trước đây cây JSX
  // gốc đổi hình khi navigate bật/tắt (going_to_pickup -> arrived) khiến React
  // tháo/gắn lại div chứa bản đồ, mapbox mất container rồi ném lỗi trong effect
  // -> TRẮNG MÀN. Giữ container không đổi vị trí trong cây để tránh hẳn lỗi đó.
  // Div bản đồ KHÔNG có React child (để mapbox tự quản canvas); nút định vị là
  // anh em, neo theo wrapper đã positioned.
  return (
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="absolute inset-0 bg-muted" />
      {navigate && (
        <button
          type="button"
          onClick={handleRecenter}
          aria-label={autoTracking ? "Đang bám theo vị trí xe" : "Về lại vị trí xe"}
          className={cn(
            "absolute bottom-28 right-4 z-10 grid h-12 w-12 place-items-center rounded-full shadow-elevated transition-colors active:scale-95",
            autoTracking
              ? "gradient-primary text-primary-foreground"
              : "bg-surface text-muted-foreground",
          )}
        >
          <LocateFixed className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
