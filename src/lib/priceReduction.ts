import { db } from "@/db";
import { priceReductions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getReducedPrice(
  tenantId: number,
  itemId: number,
  itemType: "drink" | "food",
  priceGross: number
): Promise<{ reducedPrice: number; reductionPercent: number; isActive: boolean } | null> {
  // ✅ FIX: Hole die aktuelle Zeit explizit in der deutschen Zeitzone (Europe/Berlin),
  // unabhängig davon, wo der Vercel-Server physisch steht (z.B. Washington D.C.).
  const now = new Date();
  const localTimeString = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
  const localDate = new Date(localTimeString);
  
  const localHours = String(localDate.getHours()).padStart(2, "0");
  const localMinutes = String(localDate.getMinutes()).padStart(2, "0");
  const currentTime = `${localHours}:${localMinutes}`;

  // Hole alle aktiven Preisreduktionen für dieses Item
  const activeReductions = await db
    .select()
    .from(priceReductions)
    .where(
      and(
        eq(priceReductions.tenantId, tenantId),
        eq(priceReductions.itemId, itemId),
        eq(priceReductions.itemType, itemType),
        eq(priceReductions.isActive, true)
      )
    );

  // Prüfe, ob die aktuelle Zeit in einem der Fenster liegt
  const matchingReduction = activeReductions.find((pr) => {
    const { startTime, endTime } = pr;
    if (startTime <= endTime) {
      // Normaler Fall: z.B. 10:00 - 14:00
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Über Mitternacht: z.B. 22:00 - 02:00
      return currentTime >= startTime || currentTime <= endTime;
    }
  });

  if (matchingReduction) {
    const reducedPrice = +(priceGross * (1 - matchingReduction.reductionPercent / 100)).toFixed(2);
    return {
      reducedPrice,
      reductionPercent: matchingReduction.reductionPercent,
      isActive: true,
    };
  }

  return null;
}
