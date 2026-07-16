"use client";

import { useState, useEffect, useCallback } from "react";

type SalesPoint = {
  id: number;
  name: string;
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

const POUR_DRINKS = ["Bier", "Radler", "Glühwein"];

export default function ZapfPage() {
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);
  const [queue, setQueue] = useState<Map<string, number>>(new Map());
  const [stats, setStats] = useState<Map<string, number>>(new Map());
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zapfSalesPointId");
    if (saved) setSelectedSalesPointId(parseInt(saved));
    fetchSalesPoints();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedSalesPointId !== null) {
      localStorage.setItem("zapfSalesPointId", selectedSalesPointId.toString());
      fetchQueue();
    }
  }, [selectedSalesPointId]);

  useEffect(() => {
    if (!selectedSalesPointId) return;
    const interval = setInterval(fetchQueue, 3000);
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

  async function fetchQueue() {
    if (!selectedSalesPointId) return;
    try {
      const res = await fetch(`/api/pour/queue?salesPointId=${selectedSalesPointId}`);
      if (res.ok) {
        const data: QueueItem[] = await res.json();
        const map = new Map<string, number>();
        data.forEach((item) => map.set(item.drinkName, item.pendingCount));
        setQueue(map);
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

  const handleComplete = useCallback(
    async (drinkName: string) => {
      if (!selectedSalesPointId) return;
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
        }
      } catch (err) {
        console.error(err);
      }
    },
    [selectedSalesPointId]
  );

  const selectedSalesPoint = salesPoints.find((sp) => sp.id === selectedSalesPointId);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
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

      {lastAction && (
        <div className="shrink-0 bg-green-700 text-white text-center py-1 text-sm font-bold animate-pulse">
          ✅ {lastAction}
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4 gap-4 md:gap-8">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="text-xs text-red-400 font-bold text-center uppercase tracking-wider mb-1">
            Offen
          </div>
          {POUR_DRINKS.map((drink) => {
            const count = queue.get(drink) || 0;
            return (
              <div
                key={`red-${drink}`}
                className={`w-28 h-28 md:w-40 md:h-40 rounded-2xl flex flex-col items-center justify-center
                  border-4 shadow-xl transition-all
                  ${count > 0 ? "bg-red-600 border-red-400 animate-pulse" : "bg-red-900/40 border-red-800"}
                `}
              >
                <span className="text-xs md:text-sm font-bold opacity-80">{drink}</span>
                <span className="text-4xl md:text-6xl font-extrabold">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 md:gap-6">
          <div className="text-xs text-green-400 font-bold text-center uppercase tracking-wider mb-1">
            Gezapft
          </div>
          {POUR_DRINKS.map((drink) => {
            const count = stats.get(drink) || 0;
            return (
              <button
                key={`green-${drink}`}
                onClick={() => handleComplete(drink)}
                className="w-28 h-28 md:w-40 md:h-40 rounded-2xl flex flex-col items-center justify-center
                  bg-green-600 hover:bg-green-500 active:bg-green-700 active:scale-95
                  border-4 border-green-400 shadow-xl transition-all"
              >
                <span className="text-xs md:text-sm font-bold opacity-80">{drink}</span>
                <span className="text-4xl md:text-6xl font-extrabold">{count}</span>
                <span className="text-[10px] opacity-60 mt-1">Tippen zum Abhaken</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-400">
        Grün tippen = Getränk als gezapft markieren · Rot = noch offen
      </footer>
    </div>
  );
}