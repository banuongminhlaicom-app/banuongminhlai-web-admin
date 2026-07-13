export interface PricingRule {
  openingFee: number;
  minimumPrice: number;
  firstDistanceLimit: number; // km
  firstDistancePrice: number;
  pricePerExtraKm: number;
  waitingPricePerMinute: number;
  nightSurchargePercent: number;
  nightStartHour: number;
  nightEndHour: number;
}

export const DEFAULT_PRICING: PricingRule = {
  openingFee: 50000,
  minimumPrice: 100000,
  firstDistanceLimit: 5,
  firstDistancePrice: 100000,
  pricePerExtraKm: 15000,
  waitingPricePerMinute: 2000,
  nightSurchargePercent: 20,
  nightStartHour: 22,
  nightEndHour: 5,
};

export interface QuoteInput {
  distanceKm: number;
  waitingMinutes?: number;
  scheduledAt?: Date;
  discount?: number;
  rule?: PricingRule;
}

export interface QuoteBreakdown {
  openingFee: number;
  distanceFee: number;
  waitingFee: number;
  nightSurcharge: number;
  discount: number;
  subtotal: number;
  total: number;
  isNight: boolean;
}

export function calculateQuote({
  distanceKm,
  waitingMinutes = 0,
  scheduledAt = new Date(),
  discount = 0,
  rule = DEFAULT_PRICING,
}: QuoteInput): QuoteBreakdown {
  const openingFee = rule.openingFee;
  const distanceFee =
    distanceKm <= rule.firstDistanceLimit
      ? rule.firstDistancePrice
      : rule.firstDistancePrice + (distanceKm - rule.firstDistanceLimit) * rule.pricePerExtraKm;
  const waitingFee = waitingMinutes * rule.waitingPricePerMinute;

  const h = scheduledAt.getHours();
  const isNight = h >= rule.nightStartHour || h < rule.nightEndHour;
  const preNight = openingFee + distanceFee + waitingFee;
  const nightSurcharge = isNight ? (preNight * rule.nightSurchargePercent) / 100 : 0;

  const subtotal = preNight + nightSurcharge;
  const afterDiscount = Math.max(subtotal - discount, rule.minimumPrice);
  const total = Math.round(afterDiscount / 1000) * 1000;

  return {
    openingFee,
    distanceFee,
    waitingFee,
    nightSurcharge,
    discount,
    subtotal,
    total,
    isNight,
  };
}
