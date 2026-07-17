"use client";

import { useState, useEffect, useCallback } from "react";

type SalesPoint = {
  id: number;
  name: string;
};

type Drink = {
  id: number;
  name: string;
  isPourDrink: boolean;
};

type QueueItem = {
  id: number;
  drinkName: string;
  pendingCount: number;
};

type StatItem = {
  drinkName: string;
  totalPoured: number;
};

// Default explicit list of pour drinks
const DEFAULT_POUR_BUTTONS = ["Bier", "Radler", "Glühwein"];

export default function ZapfPage() {
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);
  const [buttonList, setButtonList] = useState<string[]>(DEFAULT_POUR_BUTTONS);
  const [rawQueue, setRawQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Map<string, number>>(new Map());
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zapfSalesPointId");
    if (saved) setSelectedSalesPointId(parseInt(saved));
    fetchSalesPoints();
    fetchDrinks();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedSalesPointId !== null) {
      localStorage.setItem("zapfSalesPointId", selectedSalesPointId.toString());
      fetchQueue();
    }
  }, [selectedSalesPointId]);

  // Fast polling every 1 second
  useEffect(() => {
    if (!selectedSalesPointId) return;
    const interval = setInterval(() => {
      fetchQueue();
      fetchStats();
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedSalesPointId]);

  async function fetchSalesPoints() {
    try {
      const res = await fetch("/api/sales-points");
      if (res.ok) {
        const data = await res.json();
        setSalesPoints(data);
        if (data.length > 0 && selectedSalesPointId === null) {
          setSelectedSalesPointId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchDrinks() {
    try {
      const res = await fetch("/api/drinks");
      if (res.ok) {
        const data: Drink[] = await res.json();
        const dbPourNames = data.filter((d) => d.isPourDrink).map((d) => d.name);
        
        // Build unique button list incorporating Bier, Radler, Glühwein + any custom DB pour drinks
        const combined = new Set<string>();
        
        // Always include separate Bier, Radler, Glühwein
        combined.add("Bier");
        combined.add("Radler");
        combined.add("Glühwein");

        // Add any other pour drinks from DB that aren't combined "Bier/Radler"
        dbPourNames.forEach((name) => {
          if (name.toLowerCase() !== "bier/radler") {
            combined.add(name);
          }
        });

        setButtonList(Array.from(combined));
      }
    } catch (err) {
      console.error(err);
      setButtonList(["Bier", "Radler", "Glühwein"]);
    }
  }

  async function fetchQueue() {
    if (!selectedSalesPointId) return;
    try {
      const res = await fetch(`/api/pour/queue?salesPointId=${selectedSalesPointId}`);
      if (res.ok) {
        const data: QueueItem[] = await res.json();
        setRawQueue(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/pour/stats");
      if (res.ok) {
        const data: StatItem[] = await res.json();
        const map = new Map<string, number>();
        data.forEach((item) => map.set(item.drinkName, item.totalPoured));
        setStats(map);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Calculate pending count for a specific button (e.g. "Bier" or "Radler")
  const getPendingCount = (buttonName: string) => {
    const btnLower = buttonName.toLowerCase();
    let count = 0;
    rawQueue.forEach((q) => {
      if (q.pendingCount <= 0) return;
      const qLower = q.drinkName.toLowerCase();

      // Exact match (e.g. "Bier" == "Bier", "Radler" == "Radler")
      if (qLower === btnLower) {
        count += q.pendingCount;
      } 
      // If queue item is "Bier/Radler", split or count for both Bier and Radler
      else if (qLower.includes("bier/radler") || qLower.includes("bier / radler")) {
        if (btnLower === "bier" || btnLower === "radler") {
          count += q.pendingCount;
        }
      }
      // General partial match
      else if (qLower.includes(btnLower) || btnLower.includes(qLower)) {
        count += q.pendingCount;
      }
    });
    return count;
  };

  // Calculate total poured count for a button
  const getPouredCount = (buttonName: string) => {
    const btnLower = buttonName.toLowerCase();
    let total = 0;
    stats.forEach((poured, name) => {
      const nLower = name.toLowerCase();
      if (
        nLower === btnLower ||
        (nLower.includes("bier/radler") && (btnLower === "bier" || btnLower === "radler")) ||
        nLower.includes(btnLower) ||
        btnLower.includes(nLower)
      ) {
        total += poured;
      }
    });
    return total;
  };

  const handleComplete = useCallback(
    async (drinkName: string) => {
      if (!selectedSalesPointId) return;

      // Optimistic update
      setRawQueue((prev) =>
        prev.map((q) => {
          const qLower = q.drinkName.toLowerCase();
          const dLower = drinkName.toLowerCase();
          const matches =
            qLower === dLower ||
            (qLower.includes("bier/radler") && (dLower === "bier" || dLower === "radler")) ||
            qLower.includes(dLower) ||
            dLower.includes(qLower);

          if (matches && q.pendingCount > 0) {
            return { ...q, pendingCount: q.pendingCount - 1 };
          }
          return q;
        })
      );

      try {
        const res = await fetch("/api/pour/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salesPointId: selectedSalesPointId,
            drinkName,
          }),
        });

        if (res.ok) {
          setLastAction(`${drinkName} gezapft`);
          setTimeout(() => setLastAction(null), 1200);
          fetchQueue();
          fetchStats();
        } else {
          fetchQueue();
        }
      } catch (err) {
        console.error(err);
        fetchQueue();
      }
    },
    [selectedSalesPointId]
  );

  const selectedSalesPoint = salesPoints.find((sp) => sp.id === selectedSalesPointId);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍺</span>
          <span className="font-bold text-sm md:text-base truncate">
            Zapfen – {selectedSalesPoint?.name || "..."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSalesPointId ?? ""}
            onChange={(e) => setSelectedSalesPointId(parseInt(e.target.value))}
            className="bg-gray-700 text-white text-xs md:text-sm rounded-lg px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {salesPoints.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
          <a href="/" className="text-xs text-blue-400 hover:underline ml-1">
            Kasse
          </a>
        </div>
      </header>

      {/* Action toast */}
      {lastAction && (
        <div className="shrink-0 bg-green-700 text-white text-center py-1 text-xs md:text-sm font-bold animate-pulse">
          ✅ {lastAction}
        </div>
      )}

      {/* Main tap buttons grid - 4 separate rows/buttons for Bier, Radler, Glühwein, etc */}
      <main className="flex-1 flex items-center justify-center p-3 gap-3 md:gap-6 overflow-y-auto">
        {/* Red pending buttons - left */}
        <div className="flex flex-col gap-2.5 md:gap-4">
          <div className="text-xs text-red-400 font-bold text-center uppercase tracking-wider mb-0.5">
            Offen
          </div>
          {buttonList.map((drink) => {
            const count = getPendingCount(drink);
            return (
              <div
                key={`red-${drink}`}
                className={`w-24 h-24 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center
                  border-3 md:border-4 shadow-xl transition-all p-1.5 text-center
                  ${count > 0 ? "bg-red-600 border-red-400 animate-pulse scale-105" : "bg-red-900/40 border-red-800/60 opacity-80"}
                `}
              >
                <span className="text-xs md:text-sm font-extrabold truncate w-full leading-tight">{drink}</span>
                <span className="text-3xl md:text-5xl font-black mt-0.5">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Green complete buttons - right */}
        <div className="flex flex-col gap-2.5 md:gap-4">
          <div className="text-xs text-green-400 font-bold text-center uppercase tracking-wider mb-0.5">
            Gezapft
          </div>
          {buttonList.map((drink) => {
            const count = getPouredCount(drink);
            const pending = getPendingCount(drink);
            return (
              <button
                key={`green-${drink}`}
                onClick={() => handleComplete(drink)}
                className={`w-24 h-24 md:w-36 md:h-36 rounded-2xl flex flex-col items-center justify-center
                  bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95
                  border-3 md:border-4 border-green-400 shadow-xl transition-all p-1.5 text-center
                  ${pending === 0 ? "opacity-75 hover:opacity-100" : "ring-2 ring-green-300"}
                `}
              >
                <span className="text-xs md:text-sm font-extrabold truncate w-full leading-tight">{drink}</span>
                <span className="text-3xl md:text-5xl font-black mt-0.5">{count}</span>
                <span className="text-[9px] md:text-[10px] opacity-80">Tippen zum Abhaken</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer hint */}
      <footer className="shrink-0 bg-gray-800 border-t border-gray-700 px-3 py-1.5 text-center text-[11px] text-gray-400">
        Bier, Radler, Glühwein getrennt · Grün tippen = 1 gezapft markieren
      </footer>
    </div>
  );
}
