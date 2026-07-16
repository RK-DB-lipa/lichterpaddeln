"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Drink = {
  id: number;
  name: string;
  priceNet: number;
  taxRate: number;
  hasDeposit: boolean;
  depositAmount: number;
  color: string;
  imageUrl: string | null;
  priceGross: number;
  isPourDrink: boolean;
};

type SalesPoint = {
  id: number;
  name: string;
};

type OrderItem = {
  drinkId: number;
  drinkName: string;
  quantity: number;
  unitPriceGross: number;
  unitDeposit: number;
};

export default function POSPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<Map<number, OrderItem>>(new Map());
  const [depositReturned, setDepositReturned] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("1");
  const [pourSent, setPourSent] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    orderId: number;
    totalGross: number;
  } | null>(null);

  // Receipt panel state
  const [receiptMinimized, setReceiptMinimized] = useState(false);
  const [receiptPos, setReceiptPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const receiptRef = useRef<HTMLDivElement>(null);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Wake Lock
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          wakeLockRef.current?.addEventListener("release", () => {
            requestWakeLock();
          });
        }
      } catch {}
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("selectedSalesPointId");
    if (saved) setSelectedSalesPointId(parseInt(saved));
  }, []);

  useEffect(() => {
    if (selectedSalesPointId !== null) {
      localStorage.setItem("selectedSalesPointId", selectedSalesPointId.toString());
    }
  }, [selectedSalesPointId]);

  useEffect(() => {
    fetchDrinks();
    fetchSalesPoints();
  }, []);

  useEffect(() => {
    fetch("/api/admin/setup", { method: "POST" }).then(() => {
      fetchDrinks();
      fetchSalesPoints();
    });
  }, []);

  async function fetchDrinks() {
    try {
      const res = await fetch("/api/drinks");
      if (res.ok) setDrinks(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

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

  const addDrink = useCallback((drink: Drink) => {
    setPourSent(false);
    setOrderItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(drink.id);
      if (existing) {
        next.set(drink.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(drink.id, {
          drinkId: drink.id,
          drinkName: drink.name,
          quantity: 1,
          unitPriceGross: drink.priceGross,
          unitDeposit: drink.hasDeposit ? drink.depositAmount : 0,
        });
      }
      return next;
    });
  }, []);

  const addDepositReturn = useCallback((count: number) => {
    setOrderItems((prev) => new Map(prev));
    setDepositReturned((prev) => prev + count);
  }, []);

  const removeItem = useCallback((drinkId: number) => {
    setOrderItems((prev) => {
      const next = new Map(prev);
      next.delete(drinkId);
      return next;
    });
  }, []);

  const updateItemQuantity = useCallback((drinkId: number, newQty: number) => {
    if (newQty < 1) {
      removeItem(drinkId);
      return;
    }
    setOrderItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(drinkId);
      if (existing) {
        next.set(drinkId, { ...existing, quantity: newQty });
      }
      return next;
    });
  }, [removeItem]);

  const cancelOrder = useCallback(() => {
    setOrderItems(new Map());
    setDepositReturned(0);
    setPourSent(false);
    setShowCancelConfirm(false);
  }, []);

  const items = Array.from(orderItems.values());
  const totalDrinkGross = items.reduce(
    (sum, item) => sum + item.unitPriceGross * item.quantity,
    0
  );
  const totalDepositCharged = items.reduce(
    (sum, item) => sum + item.unitDeposit * item.quantity,
    0
  );
  const totalDepositReturn = depositReturned * 2;
  const netDeposit = totalDepositCharged - totalDepositReturn;
  const grandTotal = totalDrinkGross + netDeposit;
  const hasItems = items.length > 0 || depositReturned > 0;
  const totalDrinksCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const hasPourDrinks = items.some((item) => {
    const drink = drinks.find((d) => d.id === item.drinkId);
    return drink?.isPourDrink;
  });

  const selectedSalesPoint = salesPoints.find((sp) => sp.id === selectedSalesPointId);

  const sendToPour = useCallback(async () => {
    if (!selectedSalesPointId) return;
    const pourItems = items
      .filter((item) => {
        const drink = drinks.find((d) => d.id === item.drinkId);
        return drink?.isPourDrink;
      })
      .map((item) => ({ drinkName: item.drinkName, quantity: item.quantity }));

    if (pourItems.length === 0) return;

    try {
      const res = await fetch("/api/pour/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesPointId: selectedSalesPointId,
          items: pourItems,
        }),
      });
      if (res.ok) {
        setPourSent(true);
        setTimeout(() => setPourSent(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  }, [items, drinks, selectedSalesPointId]);

  const handleReset = useCallback(async () => {
    if (!selectedSalesPointId) return;
    if (items.length > 0) {
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              drinkId: item.drinkId,
              quantity: item.quantity,
            })),
            depositReturned,
            salesPointId: selectedSalesPointId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLastOrder({ orderId: data.orderId, totalGross: grandTotal });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }
      } catch (err) {
        console.error("Failed to save order:", err);
      }
    }
    setOrderItems(new Map());
    setDepositReturned(0);
    setPourSent(false);
    setShowResetConfirm(false);
  }, [items, depositReturned, grandTotal, selectedSalesPointId]);

  // Drag handlers for receipt
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!receiptRef.current) return;
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const rect = receiptRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setReceiptPos({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      });
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">🍺</span>
          <span className="font-bold text-sm md:text-base truncate">
            {selectedSalesPoint?.name || "Getränkewagen"}
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
          {grandTotal > 0 && (
            <span className="text-base md:text-lg font-bold text-green-400 tabular-nums">
              {grandTotal.toFixed(2)} €
            </span>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
        {/* Deposit return buttons + cancel - always on top */}
        <aside className="w-14 md:w-16 shrink-0 bg-gray-800/90 border-r border-gray-700 flex flex-col items-center py-1.5 gap-1 overflow-y-auto z-30">
          <div className="text-[9px] text-gray-400 font-bold text-center mb-0.5 leading-tight">
            Pfand<br />zurück
          </div>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => addDepositReturn(n)}
              className="w-10 h-10 md:w-11 md:h-11 rounded-lg font-bold text-xs md:text-sm
                bg-amber-600 hover:bg-amber-500 active:bg-amber-700
                active:scale-95 transition-all shadow-md
                flex flex-col items-center justify-center leading-tight"
            >
              <span>-{n * 2}€</span>
              <span className="text-[8px] opacity-80">{n}×</span>
            </button>
          ))}
          {hasItems && (
            <>
              <div className="w-full border-t border-gray-600 my-1" />
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-lg font-bold text-[10px]
                  bg-red-700 hover:bg-red-600 active:bg-red-800
                  active:scale-95 transition-all shadow-md
                  flex items-center justify-center leading-tight z-50"
                title="Bestellung abbrechen"
              >
                ✕<br />Abbr.
              </button>
            </>
          )}
        </aside>

        {/* Drink buttons grid */}
        <main className="flex-1 overflow-y-auto p-1.5 md:p-2 relative">
          {drinks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">Keine Getränke verfügbar</p>
                <a href="/admin" className="text-blue-400 underline text-sm">
                  Im Admin-Bereich konfigurieren
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
              {drinks.map((drink) => {
                const count = orderItems.get(drink.id)?.quantity || 0;
                return (
                  <button
                    key={drink.id}
                    onClick={() => addDrink(drink)}
                    className="relative rounded-xl p-2 md:p-3 text-left
                      active:scale-[0.97] transition-all shadow-md
                      border border-white/10 hover:border-white/30
                      min-h-[80px] md:min-h-[100px] flex flex-col justify-between"
                    style={{
                      backgroundColor: drink.color,
                      backgroundImage: drink.imageUrl
                        ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${drink.imageUrl})`
                        : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {count > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-extrabold text-sm shadow-lg border border-gray-200">
                        {count}
                      </div>
                    )}
                    <div className="font-extrabold text-sm md:text-base leading-tight drop-shadow-md">
                      {drink.name}
                    </div>
                    <div className="mt-auto">
                      <div className="text-lg md:text-xl font-extrabold drop-shadow-md">
                        {drink.priceGross.toFixed(2)} €
                      </div>
                      {drink.hasDeposit && (
                        <div className="text-[10px] opacity-80 mt-0.5 drop-shadow">
                          + {drink.depositAmount.toFixed(2)} € Pfand
                        </div>
                      )}
                      <div className="text-[9px] opacity-60 mt-0.5">
                        {drink.taxRate}% MwSt.
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* Floating Receipt Panel */}
        {hasItems && (
          <div
            ref={receiptRef}
            className={`absolute z-40 shadow-2xl border-2 border-gray-500 rounded-xl overflow-hidden select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            } ${receiptMinimized ? "w-auto" : "w-72 md:w-80"}`}
            style={{
              left: receiptPos.x || "auto",
              top: receiptPos.y || "auto",
              right: receiptPos.x ? undefined : 8,
              bottom: receiptPos.y ? undefined : 8,
            }}
          >
            {/* Drag handle / header */}
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className="bg-gray-700 px-3 py-2 flex items-center justify-between border-b border-gray-600"
            >
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1">
                🖐️ {totalDrinksCount} Getränke
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setReceiptMinimized((p) => !p)}
                  className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500"
                >
                  {receiptMinimized ? "▲" : "▼"}
                </button>
                <button
                  onClick={() => {
                    setReceiptPos({ x: 0, y: 0 });
                    setReceiptMinimized(false);
                  }}
                  className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500"
                  title="Zurücksetzen"
                >
                  ⌂
                </button>
              </div>
            </div>

            {!receiptMinimized && (
              <div className="bg-gray-800">
                {/* Items */}
                <div className="px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.drinkId}
                      className="flex justify-between items-center text-sm md:text-base border-b border-gray-700/40 py-1"
                    >
                      <span className="flex-1 min-w-0 truncate font-medium flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(item.drinkId);
                            setEditQuantity(item.quantity.toString());
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs underline shrink-0"
                        >
                          ✎
                        </button>
                        <span className="truncate">
                          {item.drinkName}{" "}
                          <span className="text-gray-400 text-xs">×{item.quantity}</span>
                        </span>
                      </span>
                      <span className="tabular-nums font-semibold text-sm md:text-base">
                        {(item.unitPriceGross * item.quantity).toFixed(2)} €
                      </span>
                      <button
                        onClick={() => removeItem(item.drinkId)}
                        className="ml-1.5 text-red-400 hover:text-red-300 text-sm px-1 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {totalDepositCharged > 0 && (
                    <div className="flex justify-between items-baseline text-sm md:text-base py-1 text-amber-400">
                      <span>Pfand (behalten)</span>
                      <span className="tabular-nums font-semibold">+{totalDepositCharged.toFixed(2)} €</span>
                    </div>
                  )}
                  {depositReturned > 0 && (
                    <div className="flex justify-between items-baseline text-sm md:text-base py-1 text-red-400">
                      <span>Pfand zurück ({depositReturned})</span>
                      <span className="tabular-nums font-semibold">-{totalDepositReturn.toFixed(2)} €</span>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-600 px-3 py-2 bg-gray-750 bg-gray-700/50">
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-gray-300">
                      Getränke:{" "}
                      <span className="tabular-nums font-bold">{totalDrinkGross.toFixed(2)} €</span>
                    </span>
                    {netDeposit !== 0 && (
                      <span className="text-amber-400 text-xs md:text-sm">
                        Pfand: {netDeposit > 0 ? "+" : ""}
                        <span className="tabular-nums">{netDeposit.toFixed(2)} €</span>
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-bold text-base md:text-lg text-green-400 tabular-nums">
                      Gesamt: {grandTotal.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-3 pb-2 pt-1 flex gap-2">
                  {hasPourDrinks && (
                    <button
                      onClick={sendToPour}
                      className={`w-12 h-12 rounded-full font-bold text-xs shrink-0 flex flex-col items-center justify-center transition-all shadow-lg ${
                        pourSent ? "bg-green-500" : "bg-orange-600 hover:bg-orange-500 active:bg-orange-700"
                      } active:scale-95 border-2 border-white/20`}
                    >
                      <span className="text-base">🍺</span>
                      <span className="text-[8px]">{pourSent ? "OK!" : "Zapf"}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm md:text-base bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-[0.98] transition-all shadow-lg border border-red-400/30"
                  >
                    ✅ Abschließen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-600">
            <h2 className="text-lg font-bold mb-2 text-center">⚠️ Bestellung abschließen?</h2>
            <div className="mb-3 bg-gray-700/50 rounded-lg p-2">
              <label className="block text-xs text-gray-400 mb-1">Verkaufsstelle</label>
              <select
                value={selectedSalesPointId ?? ""}
                onChange={(e) => setSelectedSalesPointId(parseInt(e.target.value))}
                className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {salesPoints.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-center mb-3 space-y-1">
              <p className="text-gray-300 text-sm">Gesamtbetrag:</p>
              <p className="text-3xl font-extrabold text-green-400 tabular-nums">
                {grandTotal.toFixed(2)} €
              </p>
              {netDeposit !== 0 && (
                <p className="text-xs text-amber-400">
                  (inkl. Pfand: {netDeposit > 0 ? "+" : ""}
                  {netDeposit.toFixed(2)} €)
                </p>
              )}
              <p className="text-xs text-gray-400">
                {totalDrinksCount} Getränke · {items.length} Positionen
              </p>
            </div>
            <button
              onClick={() => setShowCalculator(true)}
              className="w-full mb-3 py-2 rounded-lg bg-blue-700/50 hover:bg-blue-600/50 text-blue-300 text-sm font-medium border border-blue-600/30 transition-all"
            >
              🧮 Wechselgeld berechnen
            </button>
            <p className="text-xs text-gray-400 mb-4 text-center">
              Die Bestellung wird gespeichert und der Zähler auf Null zurückgesetzt.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 text-sm active:scale-[0.97] transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl font-bold bg-green-600 hover:bg-green-500 text-sm active:scale-[0.97] transition-all border border-green-400/30"
              >
                Ja, abschließen
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-600">
            <h2 className="text-lg font-bold mb-3 text-center text-red-400">
              ⚠️ Bestellung abbrechen?
            </h2>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-300">
                Möchtest du die aktuelle Bestellung wirklich verwerfen?
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {totalDrinksCount} Getränke · {grandTotal.toFixed(2)} €
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 text-sm active:scale-[0.97] transition-all"
              >
                Nein, weiter
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-sm active:scale-[0.97] transition-all border border-red-400/30"
              >
                Ja, verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-600">
            <h3 className="text-lg font-bold mb-3 text-center">Anzahl ändern</h3>
            <div className="text-center mb-3">
              <p className="text-sm text-gray-300">{orderItems.get(editingItem)?.drinkName}</p>
            </div>
            <div className="mb-4">
              <input
                type="number"
                min="0"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white text-lg font-bold text-center border border-gray-600 focus:border-blue-500 focus:outline-none tabular-nums"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 text-sm active:scale-[0.97] transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  const qty = parseInt(editQuantity);
                  if (!isNaN(qty)) updateItemQuantity(editingItem, qty);
                  setEditingItem(null);
                }}
                className="flex-1 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-sm active:scale-[0.97] transition-all"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {showCalculator && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <CalculatorModal total={grandTotal} onClose={() => setShowCalculator(false)} />
        </div>
      )}

      {showSuccess && lastOrder && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-2xl font-bold text-sm animate-bounce">
          ✅ Bestellung #{lastOrder.orderId} gespeichert – {lastOrder.totalGross.toFixed(2)} €
        </div>
      )}
    </div>
  );
}

function CalculatorModal({ total, onClose }: { total: number; onClose: () => void }) {
  const [given, setGiven] = useState("");
  const givenNum = parseFloat(given.replace(",", ".")) || 0;
  const change = givenNum - total;
  const quickAmounts = [5, 10, 20, 50];

  return (
    <div className="bg-gray-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-600">
      <h3 className="text-lg font-bold mb-3 text-center">🧮 Wechselgeld</h3>
      <div className="text-center mb-3">
        <div className="text-xs text-gray-400">Zu zahlen</div>
        <div className="text-2xl font-extrabold text-green-400 tabular-nums">
          {total.toFixed(2)} €
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Erhalten (€)</label>
        <input
          type="number"
          inputMode="decimal"
          value={given}
          onChange={(e) => setGiven(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white text-lg font-bold text-center border border-gray-600 focus:border-blue-500 focus:outline-none tabular-nums"
          placeholder="0,00"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => setGiven(amt.toFixed(2))}
            className="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-bold transition-all"
          >
            {amt} €
          </button>
        ))}
      </div>
      {givenNum > 0 && (
        <div className="text-center mb-3 p-2 rounded-lg bg-gray-700/50">
          <div className="text-xs text-gray-400">Wechselgeld</div>
          <div
            className={`text-2xl font-extrabold tabular-nums ${
              change >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {change >= 0 ? "" : "-"}
            {Math.abs(change).toFixed(2)} €
          </div>
        </div>
      )}
      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all"
      >
        Schließen
      </button>
    </div>
  );
}
