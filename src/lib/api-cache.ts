// Bộ nhớ đệm + chống gọi trùng cho API bản đồ (Goong tính tiền theo lượt gọi).
//
// Ba lớp bảo vệ, theo thứ tự rẻ dần:
//   1. Cache trong RAM     — nhanh nhất, mất khi tải lại trang
//   2. Cache sessionStorage — sống qua điều hướng trong cùng phiên
//   3. Gộp request trùng    — nhiều nơi hỏi cùng lúc chỉ gọi mạng 1 lần
//
// Không dùng localStorage vì dữ liệu địa điểm có thể cũ đi, và giữ lâu dài
// cũng không tiết kiệm thêm bao nhiêu so với rủi ro trả kết quả lỗi thời.

const memory = new Map<string, { value: unknown; expiresAt: number }>();
const inFlight = new Map<string, Promise<unknown>>();

const STORAGE_PREFIX = "goong-cache:";

function readStorage<T>(key: string): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: T; expiresAt: number };
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown, expiresAt: number) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ value, expiresAt }));
  } catch {
    // Hết dung lượng hoặc trình duyệt chặn — bỏ qua, cache RAM vẫn hoạt động.
  }
}

/**
 * Gọi `fetcher` nhưng tái sử dụng kết quả cũ nếu còn hạn, và gộp các lời gọi
 * trùng key đang chạy dở thành một.
 */
export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();

  const hit = memory.get(key);
  if (hit && now < hit.expiresAt) return hit.value as T;

  const stored = readStorage<T>(key);
  if (stored !== null) {
    memory.set(key, { value: stored, expiresAt: now + ttlMs });
    return stored;
  }

  // Đã có request y hệt đang bay — dùng chung, không gọi thêm lượt nữa.
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((value) => {
      const expiresAt = Date.now() + ttlMs;
      memory.set(key, { value, expiresAt });
      writeStorage(key, value, expiresAt);
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Chặn gọi API quá dày. Trả về false nếu lời gọi này nên bị bỏ qua.
 * Dùng thuật toán "token bucket": cho phép bùng vài lượt liên tiếp (người dùng
 * gõ nhanh), nhưng về lâu dài giới hạn theo tốc độ đã đặt.
 */
export function createRateLimiter(maxBurst: number, refillPerSecond: number) {
  let tokens = maxBurst;
  let lastRefill = Date.now();

  return function allow(): boolean {
    const now = Date.now();
    tokens = Math.min(maxBurst, tokens + ((now - lastRefill) / 1000) * refillPerSecond);
    lastRefill = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}
