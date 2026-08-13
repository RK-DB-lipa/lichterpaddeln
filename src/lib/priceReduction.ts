export type PriceReduction = {
  id: number;
  itemId: number;
  itemType: "drink" | "food";
  startTime: string; // Format: "HH:mm"
  endTime: string;   // Format: "HH:mm"
  reductionPercent: number;
  isActive: boolean;
};

export function getReducedPrice(
  priceGross: number,
  priceReductions: PriceReduction[],
  itemId: number,
  itemType: "drink" | "food"
): { reducedPrice: number; reductionPercent: number } | null {
  // ✅ FIX: Lokale Zeit des Clients/Servers verwenden, nicht UTC
  const now = new Date();
  const localHours = String(now.getHours()).padStart(2, "0");
  const localMinutes = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${localHours}:${localMinutes}`;

  const activeReduction = priceReductions.find((pr) => {
    if (!pr.isActive || pr.itemId !== itemId || pr.itemType !== itemType) {
      return false;
    }
    
    const { startTime, endTime } = pr;
    
    // Prüfen, ob die aktuelle Zeit im Reduktionsfenster liegt
    if (startTime <= endTime) {
      // Normaler Fall: z.B. 10:00 - 14:00
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Über Mitternacht: z.B. 22:00 - 02:00
      return currentTime >= startTime || currentTime <= endTime;
    }
  });

  if (activeReduction) {
    // Preis berechnen und auf 2 Nachkommastellen runden
    const reducedPrice = +(priceGross * (1 - activeReduction.reductionPercent / 100)).toFixed(2);
    return { reducedPrice, reductionPercent: activeReduction.reductionPercent };
  }

  return null;
}
