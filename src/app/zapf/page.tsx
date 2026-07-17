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

export default function ZapfPage() {
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);
  const [pourDrinkList, setPourDrinkList] = useState<string[]>([]);
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
        const pourDrinks = data.filter((d) => d.isPourDrink).map((d) => d.name);
        if (pourDrinks.length > 0) {
          setPourDrinkList(pourDrinks);
        } else {
          setPourDrinkList(["Bier", "Radler", "Glühwein"]);
        }
      }
    } catch (err) {
      console.error(err);
      setPourDrinkList(["Bier", "Radler", "Glühwein"]);
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

  // Calculate pending count for a button drink name
  const getPendingCount = (buttonDrinkName: string) => {
    const btnLower = buttonDrinkName.toLowerCase();
    let count = 0;
    rawQueue.forEach((q) => {
      if (q.pendingCount <= 0) return;
      const qLower = q.drinkName.toLowerCase();
      // Exact or partial match
      if (
        qLower === btnLower ||
        qLower.includes(btnLower) ||
        btnLower.includes(qLower)
      ) {
        count += q.pendingCount;
      }
    });
    return count;
  };

  // Calculate total poured count for a button drink name
  const getPouredCount = (buttonDrinkName: string) => {
    const btnLower = buttonDrinkName.toLowerCase();
    let total = 0;
    stats.forEach((poured, name) => {
      const nLower = name.toLowerCase();
      if (
        nLower === btnLower ||
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
          if (
            (qLower === dLower || qLower.includes(dLower) || dLower.includes(qLower)) &&
            q.pendingCount > 0
          ) {
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
          setTimeout(() => setLastAction(null), 1500);
          fetchQueue();
          fetchStats();
        } else {
          // Revert on error
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
  const displayButtons = pourDrinkList.length > 0 ? pourDrinkList : ["Bier", "Radler", "Glühwein"];

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
        <div className="shrink-0 bg-green-700 text-white text-center py-1 text-sm font-bold animate-pulse">
          ✅ {lastAction}
        </div>
      )}

      {/* Main tap buttons */}
      <main className="flex-1 flex items-center justify-center p-4 gap-4 md:gap-8 overflow-y-auto">
        {/* Red pending buttons - left */}
        <div className="flex flex-col gap-3 md:gap-5">
          <div className="text-xs text-red-400 font-bold text-center uppercase tracking-wider mb-1">
            Offen
          </div>
          {displayButtons.map((drink) => {
            const count = getPendingCount(drink);
            return (
              <div
                key={`red-${drink}`}
                className={`w-28 h-28 md:w-40 md:h-40 rounded-2xl flex flex-col items-center justify-center
                  border-4 shadow-xl transition-all p-2 text-center
                  ${count > 0 ? "bg-red-600 border-red-400 animate-pulse" : "bg-red-900/40 border-red-800/60"}
                `}
              >
                <span className="text-xs md:text-sm font-bold opacity-90 truncate w-full leading-tight">{drink}</span>
                <span className="text-4xl md:text-6xl font-extrabold mt-1">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Green complete buttons - right */}
        <div className="flex flex-col gap-3 md:gap-5">
          <div className="text-xs text-green-400 font-bold text-center uppercase tracking-wider mb-1">
            Gezapft
          </div>
          {displayButtons.map((drink) => {
            const count = getPouredCount(drink);
            const pending = getPendingCount(drink);
            return (
              <button
                key={`green-${drink}`}
                onClick={() => handleComplete(drink)}
                className={`w-28 h-28 md:w-40 md:h-40 rounded-2xl flex flex-col items-center justify-center
                  bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95
                  border-4 border-green-400 shadow-xl transition-all p-2 text-center
                  ${pending === 0 ? "opacity-75 hover:opacity-100" : ""}
                `}
              >
                <span className="text-xs md:text-sm font-bold opacity-90 truncate w-full leading-tight">{drink}</span>
                <span className="text-4xl md:text-6xl font-extrabold mt-1">{count}</span>
                <span className="text-[10px] opacity-75 mt-0.5">Tippen = -1 Offen</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer hint */}
      <footer className="shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-400">
        Grün tippen = 1 gezapft markieren (Reduziert Rot) · Synchronisiert jede Sekunde
      </footer>
    </div>
  );
}
