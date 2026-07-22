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
        (window as unknown as { __goongMap?: GoongMapInstance }).__goongMap = map;
        map.on("load", () => {
          readyRef.current = true;
          // Marker xác nhận build: bản top-down phải in pitch=0.
          console.log(
            "[GoongMap] build=topdown-v2, navigate=%s, pitch=%s",
            p.navigate,
            map.getPitch(),
          );
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
      })
      .catch(() => {
        // Không tải được SDK — giữ nguyên khung trống, fallback bên dưới lo phần hiển thị.
      });

    return () => {
      disposed = true;
      readyRef.current = false;
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
    if (driverArrowRef.current) {
      driverArrowRef.current.style.transform = `rotate(${bearingRef.current}deg)`;
    }

    if (routePolyline) drawRoute(map, routePolyline);

    if (navigate) {
      // Ở chế độ dẫn đường không được rơi xuống fitBounds bên dưới: fitBounds ép
      // bearing về 0 và thu nhỏ zoom (18 -> ~13.7), tức mất hướng xe và mất luôn
      // góc cận cảnh. Chưa có GPS tài xế thì tạm lấy điểm đón/đến làm tâm.
      const focus = driver ?? pickup ?? dropoff;
      if (driver) {
        // Luôn cập nhật hướng di chuyển (kể cả lúc không tự bám) để nút định vị
        // luôn xoay camera đúng hướng xe ngay khi bấm — chỉ tính lại khi đã đi
        // đủ xa (~8m) so với lần trước, tránh hướng bị nhiễu lúc gần như đứng yên.
        const prev = prevDriverRef.current;
        if (prev) {
          const movedM = Math.hypot(driver.lat - prev.lat, driver.lng - prev.lng) * 111_000; // ước lượng nhanh, đủ dùng để so ngưỡng
          if (movedM > 8) {
            bearingRef.current = computeBearing(prev, driver);
            prevDriverRef.current = driver;
          }
        } else {
          prevDriverRef.current = driver;
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

  const mapEl = <div ref={containerRef} className={cn("bg-muted", className)} />;
  if (!navigate) return mapEl;

  return (
    // className (vị trí/kích thước bản đồ) đã nằm trên mapEl bên trong; wrapper
    // này chỉ cần lấp đầy đúng chỗ đó để làm điểm neo cho nút định vị — dùng
    // style trực tiếp thay vì class Tailwind để tránh twMerge xung đột với các
    // class position (absolute/relative) mà caller đã đặt trên mapEl.
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {mapEl}
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
    </div>
  );
}
