import { db } from "@/db";
import { priceReductions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Prüft ob eine Preisreduktion für ein Item aktiv ist und gibt den reduzierten Preis zurück
 * @param tenantId Tenant-ID
 * @param itemId ID des Drinks oder Foods
 * @param itemType "drink" oder "food"
 * @param originalPrice Originaler Bruttopreis
 * @returns { reducedPrice, reductionPercent, isActive }
 */
export async function getReducedPrice(
  tenantId: number,
  itemId: number,
  itemType: "drink" | "food",
  originalPrice: number
): Promise<{ reducedPrice: number; reductionPercent: number; isActive: boolean }> {
  // Aktuelle Uhrzeit im Format "HH:MM"
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Aktive Preisreduktionen für dieses Item abrufen
  const reductions = await db
    .select()
    .from(priceReductions)
    .where(and(
      eq(priceReductions.tenantId, tenantId),
      eq(priceReductions.itemId, itemId),
      eq(priceReductions.itemType, itemType),
    ));

  // Prüfen ob eine Reduktion zur aktuellen Zeit aktiv ist
  for (const reduction of reductions) {
    if (!reduction.isActive) continue;

    const startTime = reduction.startTime;
    const endTime = reduction.endTime;

    // Prüfen ob die aktuelle Zeit im Zeitraum liegt
    // Unterstützt auch über Mitternacht (z.B. 23:00 bis 02:00)
    let isActive = false;

    if (startTime <= endTime) {
      // Normaler Fall: z.B. 10:00 bis 18:00
      isActive = currentTime >= startTime && currentTime <= endTime;
    } else {
      // Über Mitternacht: z.B. 23:00 bis 02:00
      isActive = currentTime >= startTime || currentTime <= endTime;
    }

    if (isActive) {
      const reducedPrice = +(originalPrice * (1 - reduction.reductionPercent / 100)).toFixed(2);
      return {
        reducedPrice,
        reductionPercent: reduction.reductionPercent,
        isActive: true,
      };
    }
  }

  // Keine aktive Reduktion gefunden
  return {
    reducedPrice: originalPrice,
    reductionPercent: 0,
    isActive: false,
  };
}
