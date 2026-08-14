"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Drink = { id: number; name: string; priceGross: number; taxRate: number; hasDeposit: boolean; depositAmount: number; cupSize: string; color: string; imageUrl: string | null; isPourDrink: boolean; salesPointIds?: number[]; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type Food = { id: number; name: string; priceGross: number; taxRate: number; color: string; imageUrl: string | null; isCookItem: boolean; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type Event = { id: number; name: string; startDate: string; endDate: string; isActive: boolean; drinkCount: number; foodCount: number };
type SalesPoint = { id: number; name: string };
type OrderItem = { drinkId: number; drinkName: string; quantity: number; unitPriceGross: number; unitDeposit: number };
type FoodOrderItem = { foodId: number; foodName: string; quantity: number; unitPriceGross: number };
type HandoutState = { orderId: number; salesPointName: string; items: Array<OrderItem & { isPourDrink: boolean }>; foodItems: FoodOrderItem[]; checked: Record<number, boolean>; totalGross: number; depositReturnedCount: number };

const DEPOSIT_PER_RETURN = 2.0;

export default function POSPage() {
  const [session, setSession] = useState<any>(undefined);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [loginError, setLoginError] = useState("");

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);

  const [orderItems, setOrderItems] = useState<Map<number, OrderItem>>(new Map());
  const [orderFoodItems, setOrderFoodItems] = useState<Map<number, FoodOrderItem>>(new Map());
  const [activeTab, setActiveTab] = useState<"drinks" | "foods">("drinks");

  const [depositReturned02, setDepositReturned02] = useState(0);
  const [depositReturned04, setDepositReturned04] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: "drink" | "food"; id: number } | null>(null);
  const [editQuantity, setEditQuantity] = useState("1");
  const [pourSent, setPourSent] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ orderId: number; totalGross: number } | null>(null);
  const [handout, setHandout] = useState<HandoutState | null>(null);

  const [receiptMinimized, setReceiptMinimized] = useState(false);
  const [receiptPos, setReceiptPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const receiptRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  // ✅ NEU: State für aufklappbare Gruppen
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const items = Array.from(orderItems.values());
  const foodItems = Array.from(orderFoodItems.values());

  useEffect(() => { checkAuth(); }, []);
  async function checkAuth() { try { const r = await fetch("/api/auth/me"); setSession(r.ok ? await r.json() : null); } catch { setSession(null); } }
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginUsername, password: loginPassword, displayName: loginDisplayName || loginUsername }) });
      if (r.ok) window.location.reload(); else { const d = await r.json(); setLoginError(d.error || "Fehler"); }
    } catch { setLoginError("Verbindungsfehler"); }
  }
  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.reload(); }

  useEffect(() => { async function rwl() { try { if ("wakeLock" in navigator) { wakeLockRef.current = await (navigator as any).wakeLock.request("screen"); wakeLockRef.current?.addEventListener("release", () => rwl()); } } catch {} } rwl(); const hv = () => { if (document.visibilityState === "visible") rwl(); }; document.addEventListener("visibilitychange", hv); return () => { document.removeEventListener("visibilitychange", hv); wakeLockRef.current?.release?.()?.catch?.(() => {}); }; }, []);
  useEffect(() => { const s = localStorage.getItem("selectedSalesPointId"); if (s) setSelectedSalesPointId(parseInt(s)); }, []);
  useEffect(() => { if (selectedSalesPointId !== null) localStorage.setItem("selectedSalesPointId", selectedSalesPointId.toString()); }, [selectedSalesPointId]);
  useEffect(() => {
    if (!session?.authenticated) return;
    fetch("/api/admin/setup", { method: "POST" }).then(() => { 
      fetchEvents();
      fetchFoods();
      fetchDrinks().then(() => fetchSalesPoints()); 
    });
  }, [session?.authenticated]);

  async function fetchDrinks() {
    try {
      let url = "/api/drinks";
      const params = new URLSearchParams();
      if (selectedSalesPointId) params.set("salesPointId", selectedSalesPointId.toString());
      if (selectedEventId) params.set("eventId", selectedEventId.toString());
      if (params.toString()) url += "?" + params.toString();
      const r = await fetch(url); if (r.ok) setDrinks(await r.json());
    } catch (err) { console.error(err); }
  }
  async function fetchFoods() {
    try {
      let url = "/api/foods";
      if (selectedEventId) url += "?eventId=" + selectedEventId;
      const r = await fetch(url); if (r.ok) setFoods(await r.json());
    } catch (err) { console.error(err); }
  }
  async function fetchEvents() {
    try {
      const r = await fetch("/api/events?active=true&date=" + new Date().toISOString().split("T")[0]);
      if (r.ok) {
        const evts = await r.json();
        setEvents(evts);
        if (evts.length > 0 && selectedEventId === null) {
          setSelectedEventId(evts[0].id);
        }
      }
    } catch (err) { console.error(err); }
  }
  async function fetchSalesPoints() {
    try { const r = await fetch("/api/sales-points"); if (r.ok) { const d = await r.json(); setSalesPoints(d); if (d.length > 0 && selectedSalesPointId === null) setSelectedSalesPointId(d[0].id); } } catch (err) { console.error(err); }
  }

  useEffect(() => { if (session?.authenticated && selectedSalesPointId) { fetchDrinks(); fetchFoods(); } }, [session?.authenticated, selectedSalesPointId, selectedEventId]);

  const addDrink = useCallback((drink: Drink) => {
    setPourSent(false);
    const priceToUse = drink.hasReduction && drink.reducedPrice !== undefined ? drink.reducedPrice : drink.priceGross;
    setOrderItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(drink.id);
      if (existing) {
        next.set(drink.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(drink.id, { drinkId: drink.id, drinkName: drink.name, quantity: 1, unitPriceGross: priceToUse, unitDeposit: drink.hasDeposit ? drink.depositAmount : 0 });
      }
      return next;
    });
  }, []);

  const addFood = useCallback((food: Food) => {
    const priceToUse = food.hasReduction && food.reducedPrice !== undefined ? food.reducedPrice : food.priceGross;
    setOrderFoodItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(food.id);
      if (existing) {
        next.set(food.id, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(food.id, { foodId: food.id, foodName: food.name, quantity: 1, unitPriceGross: priceToUse });
      }
      return next;
    });
  }, []);

  const addDepositReturn = useCallback(async (size: "02" | "04", count: number) => {
    if (selectedSalesPointId) { await fetch("/api/cups/return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesPointId: selectedSalesPointId, size, count }) }).catch(() => {}); }
    if (size === "02") setDepositReturned02((p) => p + count); else setDepositReturned04((p) => p + count);
  }, [selectedSalesPointId]);

  const removeItem = useCallback((type: "drink" | "food", id: number) => {
    if (type === "drink") {
      setOrderItems((prev) => { const next = new Map(prev); next.delete(id); return next; });
    } else {
      setOrderFoodItems((prev) => { const next = new Map(prev); next.delete(id); return next; });
    }
  }, []);

  const updateItemQuantity = useCallback((type: "drink" | "food", id: number, newQty: number) => {
    if (newQty < 1) { removeItem(type, id); return; }
    if (type === "drink") {
      setOrderItems((prev) => { const next = new Map(prev); const existing = next.get(id); if (existing) next.set(id, { ...existing, quantity: newQty }); return next; });
    } else {
      setOrderFoodItems((prev) => { const next = new Map(prev); const existing = next.get(id); if (existing) next.set(id, { ...existing, quantity: newQty }); return next; });
    }
  }, [removeItem]);

  const cancelOrder = useCallback(async () => {
    if (pourSent && selectedSalesPointId) {
      const pourItems = items.filter((i) => drinks.find((d) => d.id === i.drinkId)?.isPourDrink);
      if (pourItems.length > 0) {
        try {
          await fetch("/api/pour/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              salesPointId: selectedSalesPointId,
              items: pourItems.map((i) => ({ drinkName: i.drinkName, quantity: i.quantity }))
            })
          });
        } catch (err) {
          console.error("Fehler beim Stornieren der Zapf-Queue:", err);
        }
      }
    }

    setOrderItems(new Map());
    setOrderFoodItems(new Map());
    setDepositReturned02(0);
    setDepositReturned04(0);
    setPourSent(false);
    setRemoveMode(false);
    setShowCancelConfirm(false);
  }, [items, drinks, selectedSalesPointId, pourSent]);

  const toCents = (euros: number) => Math.round(euros * 100);
  const toEuros = (cents: number) => +(cents / 100).toFixed(2);

  const totalDrinkGrossCents = items.reduce((sum, i) => sum + toCents(i.unitPriceGross) * i.quantity, 0);
  const totalFoodGrossCents = foodItems.reduce((sum, i) => sum + toCents(i.unitPriceGross) * i.quantity, 0);
  const totalDrinkGross = toEuros(totalDrinkGrossCents);
  const totalFoodGross = toEuros(totalFoodGrossCents);

  const totalDepositChargedCents = items.reduce((sum, i) => sum + toCents(i.unitDeposit) * i.quantity, 0);
  const totalDepositCharged = toEuros(totalDepositChargedCents);

  const depositReturned = depositReturned02 + depositReturned04;
  const totalDepositReturnCents = toCents(depositReturned * DEPOSIT_PER_RETURN);
  const totalDepositReturn = toEuros(totalDepositReturnCents);
  const netDepositCents = totalDepositChargedCents - totalDepositReturnCents;
  const netDeposit = toEuros(netDepositCents);
  const grandTotalCents = totalDrinkGrossCents + totalFoodGrossCents + netDepositCents;
  const grandTotal = toEuros(grandTotalCents);

  const hasItems = items.length > 0 || foodItems.length > 0 || depositReturned > 0;
  const totalDrinksCount = items.reduce((s, i) => s + i.quantity, 0);
  const totalFoodsCount = foodItems.reduce((s, i) => s + i.quantity, 0);
  const pourItemCount = items.filter((i) => drinks.find((d) => d.id === i.drinkId)?.isPourDrink).reduce((s, i) => s + i.quantity, 0);
  const hasPourDrinks = pourItemCount > 0;
  const selectedSalesPoint = salesPoints.find((sp) => sp.id === selectedSalesPointId);

  const sendToPour = useCallback(async () => {
    if (!selectedSalesPointId || pourSent) return;
    const pourItems = items.filter((i) => drinks.find((d) => d.id === i.drinkId)?.isPourDrink).map((i) => ({ drinkName: i.drinkName, quantity: i.quantity }));
    if (pourItems.length === 0) return;
    try { const r = await fetch("/api/pour/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesPointId: selectedSalesPointId, items: pourItems }) }); if (r.ok) setPourSent(true); } catch (err) { console.error(err); }
  }, [items, drinks, selectedSalesPointId, pourSent]);

  const handleReset = useCallback(async () => {
    if (!selectedSalesPointId) return;
    
    if (hasPourDrinks && !pourSent) {
      alert("⚠️ Bitte erst die Zapf-Getränke an die Zapfanlage senden, bevor du die Bestellung abschließt!");
      return;
    }

    if (items.length > 0 || foodItems.length > 0) {
      try {
        const cashierName = session?.displayName || session?.username || "";
        const r = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ drinkId: i.drinkId, quantity: i.quantity })),
            foodItems: foodItems.map((i) => ({ foodId: i.foodId, quantity: i.quantity })),
            depositReturned,
            depositReturned02,
            depositReturned04,
            salesPointId: selectedSalesPointId,
            cashierName
          })
        });
        if (r.ok) {
          const data = await r.json();
          setLastOrder({ orderId: data.orderId, totalGross: grandTotal });
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          setHandout({
            orderId: data.orderId,
            salesPointName: selectedSalesPoint?.name || "",
            items: items.map((i) => ({ ...i, isPourDrink: drinks.find((d) => d.id === i.drinkId)?.isPourDrink ?? false })),
            foodItems: foodItems,
            checked: {},
            totalGross: grandTotal,
            depositReturnedCount: depositReturned
          });
        }
      } catch (err) { console.error(err); }
    }
    setOrderItems(new Map());
    setOrderFoodItems(new Map());
    setDepositReturned02(0);
    setDepositReturned04(0);
    setPourSent(false);
    setRemoveMode(false);
    setShowResetConfirm(false);
  }, [items, foodItems, depositReturned, depositReturned02, depositReturned04, grandTotal, selectedSalesPointId, selectedSalesPoint, drinks, session, hasPourDrinks, pourSent]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => { if (!receiptRef.current) return; setIsDragging(true); const cx = "touches" in e ? e.touches[0].clientX : e.clientX; const cy = "touches" in e ? e.touches[0].clientY : e.clientY; const r = receiptRef.current.getBoundingClientRect(); dragOffset.current = { x: cx - r.left, y: cy - r.top }; };
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !receiptRef.current || !receiptRef.current.parentElement) return;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    const panel = receiptRef.current;
    const container = receiptRef.current.parentElement.getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    let nx = cx - dragOffset.current.x - container.left;
    let ny = cy - dragOffset.current.y - container.top;
    nx = Math.max(0, Math.min(nx, container.width - rect.width));
    ny = Math.max(0, Math.min(ny, container.height - rect.height));
    setReceiptPos({ x: nx, y: ny });
  }, [isDragging]);
  const handleDragEnd = useCallback(() => setIsDragging(false), []);
  useEffect(() => { if (isDragging) { window.addEventListener("mousemove", handleDragMove); window.addEventListener("mouseup", handleDragEnd); window.addEventListener("touchmove", handleDragMove); window.addEventListener("touchend", handleDragEnd); return () => { window.removeEventListener("mousemove", handleDragMove); window.removeEventListener("mouseup", handleDragEnd); window.removeEventListener("touchmove", handleDragMove); window.removeEventListener("touchend", handleDragEnd); }; } }, [isDragging, handleDragMove, handleDragEnd]);

  const handoutCheckedCount = handout ? handout.items.filter((i) => handout.checked[i.drinkId]).length + handout.foodItems.filter((i) => handout.checked[-i.foodId]).length : 0;
  const handoutAllItems = handout ? handout.items.length + handout.foodItems.length : 0;
  const handoutAllDone = handout !== null && handoutCheckedCount === handoutAllItems;

  // ✅ NEU: Funktion zum Auf-/Zuklappen von Gruppen
  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  if (session === undefined) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;

  if (!session?.authenticated) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center p-4 logo-watermark">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <div className="flex items-center gap-3 mb-2"><img src="/images/turbotap-logo.png" alt="TurboTap" className="w-10 h-10 rounded-lg" /><h1 className="text-2xl font-bold text-white">TurboTap</h1></div>
          <p className="text-xs text-gray-400 mb-6">Kasse · Mitarbeiter-Anmeldung</p>
          {loginError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Account (Benutzername)</label><input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus placeholder="z.B. team-festzelt" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Dein Mitarbeiter-Name *</label><input type="text" value={loginDisplayName} onChange={(e) => setLoginDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Max, Anna, Tom" required /></div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 transition-all">Als Mitarbeiter anmelden</button>
          </div>
          <p className="text-[10px] text-gray-500 mt-4 text-center">Dein Mitarbeiter-Name wird für alle Bestellungen und die Statistik erfasst.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden logo-watermark">
      <header className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/images/turbotap-logo.png" alt="" className="w-6 h-6 rounded" />
          <span className="font-bold text-sm md:text-base truncate">TurboTap · {selectedSalesPoint?.name || "Getränkewagen"}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 text-gray-300 hidden sm:inline">👤 {session.displayName || session.username}</span>
          {events.length > 0 && (
            <select value={selectedEventId ?? ""} onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value) : null)} className="bg-purple-700 text-white text-xs md:text-sm rounded-lg px-2 py-1 border border-purple-500 focus:border-blue-500 focus:outline-none" title="Event auswählen">
              <option value="">Alle Artikel</option>
              {events.map((ev) => (<option key={ev.id} value={ev.id}>{ev.name}</option>))}
            </select>
          )}
          <a href="/zapf" className="text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-2 py-1 border border-gray-600 font-bold transition-colors">🍺 Zapf</a>
          {foods.some(f => f.isCookItem) && <a href="/koch" className="text-xs bg-orange-700 hover:bg-orange-600 rounded-lg px-2 py-1 border border-orange-500 font-bold transition-colors">🍳 Koch</a>}
          <select value={selectedSalesPointId ?? ""} onChange={(e) => setSelectedSalesPointId(parseInt(e.target.value))} className="bg-gray-700 text-white text-xs md:text-sm rounded-lg px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none">
            {salesPoints.map((sp) => (<option key={sp.id} value={sp.id}>{sp.name}</option>))}
          </select>
          {grandTotal > 0 && <span className="text-base md:text-lg font-bold text-green-400 tabular-nums">{grandTotal.toFixed(2)} €</span>}
          <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 ml-0.5" title="Abmelden">🚪</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
        <aside className="w-14 md:w-16 shrink-0 bg-gray-800/90 border-r border-gray-700 flex flex-col items-center py-1.5 gap-1 overflow-y-auto z-30">
          <div className="text-[9px] text-gray-400 font-bold text-center mb-0.5 leading-tight">Pfand<br/>zurück</div>
          <div className="text-[9px] text-amber-400 font-extrabold text-center leading-tight">0,2 l</div>
          {[1,2,3,4].map((n) => (<button key={`02-${n}`} onClick={() => addDepositReturn("02", n)} className="w-10 h-10 md:w-11 md:h-11 rounded-lg font-bold text-xs md:text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-700 active:scale-95 transition-all shadow-md flex flex-col items-center justify-center leading-tight"><span>-{n*2}€</span><span className="text-[8px] opacity-80">{n}×</span></button>))}
          <div className="w-full border-t border-gray-600 my-0.5" />
          <div className="text-[9px] text-amber-400 font-extrabold text-center leading-tight">0,4 l</div>
          {[1,2,3,4].map((n) => (<button key={`04-${n}`} onClick={() => addDepositReturn("04", n)} className="w-10 h-10 md:w-11 md:h-11 rounded-lg font-bold text-xs md:text-sm bg-amber-700 hover:bg-amber-600 active:bg-amber-800 active:scale-95 transition-all shadow-md flex flex-col items-center justify-center leading-tight"><span>-{n*2}€</span><span className="text-[8px] opacity-80">{n}×</span></button>))}
          {hasItems && (<><div className="w-full border-t border-gray-600 my-0.5" />
            <button onClick={() => setRemoveMode((m) => !m)} className={`w-10 h-10 md:w-11 md:h-11 rounded-lg font-bold text-lg transition-all shadow-md flex items-center justify-center ${removeMode ? "bg-red-500 text-white ring-2 ring-red-300 scale-110" : "bg-gray-700 hover:bg-gray-600 text-gray-300"} active:scale-95`} title="Minus-Modus">−</button></>)}
          {hasItems && (<><div className="w-full border-t border-gray-600 my-1" />
            <button onClick={() => setShowCancelConfirm(true)} className="w-10 h-10 md:w-11 md:h-11 rounded-lg font-bold text-[10px] bg-red-700 hover:bg-red-600 active:bg-red-800 active:scale-95 transition-all shadow-md flex items-center justify-center leading-tight z-50">✕<br/>Abbr.</button></>)}
        </aside>

        <main className="flex-1 overflow-y-auto p-1.5 md:p-2 relative">
          {removeMode && <div className="bg-red-700/60 border border-red-500 rounded-lg px-2 py-1 mb-1.5 text-xs font-bold text-center animate-pulse">⚡ Entfernen-Modus aktiv – Tippe auf Artikel zum Reduzieren</div>}

          {drinks.length > 0 && foods.length > 0 && (
            <div className="flex gap-2 mb-2">
              <button onClick={() => setActiveTab("drinks")} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "drinks" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>🍺 Getränke ({drinks.length})</button>
              <button onClick={() => setActiveTab("foods")} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === "foods" ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>🍔 Speisen ({foods.length})</button>
            </div>
          )}

          {activeTab === "drinks" && drinks.length === 0 && <div className="flex items-center justify-center h-full text-gray-500"><div className="text-center"><p className="text-lg mb-2">Keine Getränke verfügbar</p><a href="/admin" className="text-blue-400 underline text-sm">Im Admin-Bereich konfigurieren</a></div></div>}
          {activeTab === "foods" && foods.length === 0 && <div className="flex items-center justify-center h-full text-gray-500"><div className="text-center"><p className="text-lg mb-2">Keine Speisen verfügbar</p><a href="/admin" className="text-blue-400 underline text-sm">Im Admin-Bereich konfigurieren</a></div></div>}

          {activeTab === "drinks" && drinks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
              {(() => {
                let lastGroup: string | null = "__NONE__";
                return drinks.map((drink) => {
                  const currentGroup = drink.group || null;
                  const showSeparator = currentGroup && currentGroup !== lastGroup;
                  if (currentGroup) lastGroup = currentGroup;
                  
                  const isCollapsed = currentGroup ? collapsedGroups.has(currentGroup) : false;

                  return (
                    <div key={drink.id} className="contents">
                      {showSeparator && currentGroup && (
                        <div 
                          className="col-span-full flex items-center gap-2 my-2 cursor-pointer select-none hover:bg-gray-800/50 rounded-lg px-2 py-1 transition-colors"
                          onClick={() => toggleGroup(currentGroup)}
                          title="Gruppe auf-/zuklappen"
                        >
                          <span className="h-px flex-1 bg-gray-600" />
                          <span className="text-xs text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1">
                            {isCollapsed ? "▶" : "▼"} {currentGroup}
                          </span>
                          <span className="h-px flex-1 bg-gray-600" />
                        </div>
                      )}
                      
                      {!isCollapsed && (
                        <button 
                          onClick={() => {
                            if (removeMode) {
                              const currentCount = orderItems.get(drink.id)?.quantity || 0;
                              if (currentCount > 0) {
                                updateItemQuantity("drink", drink.id, currentCount - 1);
                                setPourSent(false);
                              }
                            } else {
                              addDrink(drink);
                            }
                          }} 
                          className={`relative rounded-xl p-2 md:p-3 text-left active:scale-[0.97] transition-all shadow-md border ${removeMode && (orderItems.get(drink.id)?.quantity || 0) > 0 ? "border-red-400 border-2" : "border-white/10 hover:border-white/30"} min-h-[80px] md:min-h-[100px] flex flex-col justify-between`} 
                          style={{ backgroundColor: drink.color, backgroundImage: drink.imageUrl ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${drink.imageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                        >
                          {(orderItems.get(drink.id)?.quantity || 0) > 0 && <div className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-extrabold text-sm shadow-lg border border-gray-200">{orderItems.get(drink.id)?.quantity}</div>}
                          {removeMode && (orderItems.get(drink.id)?.quantity || 0) > 0 && <div className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-xs shadow-lg">−</div>}
                          <div className="font-extrabold text-sm md:text-base leading-tight drop-shadow-md">{drink.name}</div>
                          <div className="mt-auto">
                            <div className="text-lg md:text-xl font-extrabold drop-shadow-md">
                              {drink.hasReduction && drink.reducedPrice !== undefined ? (
                                <>
                                  <span className="text-sm line-through opacity-60 mr-1">{drink.priceGross.toFixed(2)} €</span>
                                  <span className="text-green-400">{drink.reducedPrice.toFixed(2)} €</span>
                                </>
                              ) : (
                                drink.priceGross.toFixed(2) + " €"
                              )}
                            </div>
                            {drink.hasDeposit && <div className="text-[10px] opacity-80 mt-0.5 drop-shadow">+ {drink.depositAmount.toFixed(2)} € Pfand</div>}
                            <div className="text-[9px] opacity-60 mt-0.5">
                              {drink.taxRate}% MwSt.
                              {drink.hasReduction && drink.reductionPercent && <span className="ml-1 text-green-400 font-bold">-{drink.reductionPercent}%</span>}
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {activeTab === "foods" && foods.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
              {foods.map((food) => {
                const count = orderFoodItems.get(food.id)?.quantity || 0;
                return (
                  <button 
                    key={food.id} 
                    onClick={() => {
                      if (removeMode) {
                        const currentCount = orderFoodItems.get(food.id)?.quantity || 0;
                        if (currentCount > 0) {
                          updateItemQuantity("food", food.id, currentCount - 1);
                        }
                      } else {
                        addFood(food);
                      }
                    }} 
                    className={`relative rounded-xl p-2 md:p-3 text-left active:scale-[0.97] transition-all shadow-md border ${removeMode && count > 0 ? "border-red-400 border-2" : "border-white/10 hover:border-white/30"} min-h-[80px] md:min-h-[100px] flex flex-col justify-between`} 
                    style={{ backgroundColor: food.color, backgroundImage: food.imageUrl ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${food.imageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
                  >
                    {count > 0 && <div className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-extrabold text-sm shadow-lg border border-gray-200">{count}</div>}
                    {removeMode && count > 0 && <div className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-xs shadow-lg">−</div>}
                    <div className="font-extrabold text-sm md:text-base leading-tight drop-shadow-md">{food.name}</div>
                    <div className="mt-auto">
                      <div className="text-lg md:text-xl font-extrabold drop-shadow-md">
                        {food.hasReduction && food.reducedPrice !== undefined ? (
                          <>
                            <span className="text-sm line-through opacity-60 mr-1">{food.priceGross.toFixed(2)} €</span>
                            <span className="text-green-400">{food.reducedPrice.toFixed(2)} €</span>
                          </>
                        ) : (
                          food.priceGross.toFixed(2) + " €"
                        )}
                      </div>
                      {food.group && <div className="text-[10px] opacity-80 mt-0.5 drop-shadow">📁 {food.group}</div>}
                      <div className="text-[9px] opacity-60 mt-0.5">
                        {food.taxRate}% MwSt.
                        {food.hasReduction && food.reductionPercent && <span className="ml-1 text-green-400 font-bold">-{food.reductionPercent}%</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {hasItems && (
          <div ref={receiptRef} className={`absolute z-40 shadow-2xl border-2 border-gray-500 rounded-xl overflow-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${receiptMinimized ? "w-auto" : "w-72 md:w-80"}`} style={{ left: receiptPos.x || "auto", top: receiptPos.y || "auto", right: receiptPos.x ? undefined : 8, bottom: receiptPos.y ? undefined : 8 }}>
            <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="bg-gray-700 px-3 py-2 flex items-center justify-between border-b border-gray-600">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1">🖐️ {totalDrinksCount + totalFoodsCount} Artikel</span>
              <div className="flex items-center gap-1"><button onClick={() => setReceiptMinimized((p) => !p)} className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500">{receiptMinimized ? "▲" : "▼"}</button><button onClick={() => { setReceiptPos({ x:0, y:0 }); setReceiptMinimized(false); }} className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500">⌂</button></div>
            </div>
            {!receiptMinimized && (
              <div className="bg-gray-800">
                <div className="px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                  {items.map((item) => (<div key={`d-${item.drinkId}`} className="flex justify-between items-center text-sm md:text-base border-b border-gray-700/40 py-1">
                    <span className="flex-1 min-w-0 truncate font-medium flex items-center gap-1.5"><button onClick={() => { setEditingItem({ type: "drink", id: item.drinkId }); setEditQuantity(item.quantity.toString()); }} className="text-blue-400 hover:text-blue-300 text-xs underline shrink-0">✎</button><span className="truncate">{item.drinkName} <span className="text-gray-400 text-xs">×{item.quantity}</span></span></span>
                    <span className="tabular-nums font-semibold text-sm md:text-base">{(item.unitPriceGross * item.quantity).toFixed(2)} €</span>
                    <button onClick={() => removeItem("drink", item.drinkId)} className="ml-1.5 text-red-400 hover:text-red-300 text-sm px-1 shrink-0">✕</button>
                  </div>))}
                  {foodItems.map((item) => (<div key={`f-${item.foodId}`} className="flex justify-between items-center text-sm md:text-base border-b border-gray-700/40 py-1">
                    <span className="flex-1 min-w-0 truncate font-medium flex items-center gap-1.5"><button onClick={() => { setEditingItem({ type: "food", id: item.foodId }); setEditQuantity(item.quantity.toString()); }} className="text-green-400 hover:text-green-300 text-xs underline shrink-0">✎</button><span className="truncate">{item.foodName} <span className="text-gray-400 text-xs">×{item.quantity}</span></span></span>
                    <span className="tabular-nums font-semibold text-sm md:text-base">{(item.unitPriceGross * item.quantity).toFixed(2)} €</span>
                    <button onClick={() => removeItem("food", item.foodId)} className="ml-1.5 text-red-400 hover:text-red-300 text-sm px-1 shrink-0">✕</button>
                  </div>))}
                  {totalDepositCharged > 0 && <div className="flex justify-between items-baseline text-sm md:text-base py-1 text-amber-400"><span>Pfand (behalten)</span><span className="tabular-nums font-semibold">+{totalDepositCharged.toFixed(2)} €</span></div>}
                  {depositReturned > 0 && <div className="flex justify-between items-baseline text-sm md:text-base py-1 text-red-400"><span>Pfand zurück ({depositReturned02>0 && `${depositReturned02}× 0,2l`}{depositReturned02>0 && depositReturned04>0 && " + "}{depositReturned04>0 && `${depositReturned04}× 0,4l`})</span><span className="tabular-nums font-semibold">-{totalDepositReturn.toFixed(2)} €</span></div>}
                </div>
                <div className="border-t border-gray-600 px-3 py-2 bg-gray-700/50">
                  <div className="flex justify-between items-center text-sm md:text-base"><span className="text-gray-300">Getränke: <span className="tabular-nums font-bold">{totalDrinkGross.toFixed(2)} €</span></span>{netDeposit !== 0 && <span className="text-amber-400 text-xs md:text-sm">Pfand: {netDeposit > 0 ? "+" : ""}<span className="tabular-nums">{netDeposit.toFixed(2)} €</span></span>}</div>
                  {totalFoodGross > 0 && <div className="flex justify-between items-center text-sm md:text-base"><span className="text-gray-300">Speisen: <span className="tabular-nums font-bold">{totalFoodGross.toFixed(2)} €</span></span></div>}
                  <div className="flex justify-between items-center mt-1"><span className="font-bold text-base md:text-lg text-green-400 tabular-nums">Gesamt: {grandTotal.toFixed(2)} €</span></div>
                </div>
                <div className="px-3 pb-2 pt-1 flex gap-2">
                  {hasPourDrinks && <button onClick={sendToPour} className={`w-12 h-12 rounded-full font-bold text-xs shrink-0 flex flex-col items-center justify-center transition-all shadow-lg ${pourSent ? "bg-green-500" : "bg-orange-600 hover:bg-orange-500 active:bg-orange-700"} active:scale-95 border-2 border-white/20`}><span className="text-base">{pourSent ? "✓" : "🍺"}</span><span className="text-[8px]">{pourSent ? "OK!" : "Zapf"}</span></button>}
                  <button onClick={() => setShowResetConfirm(true)} className="flex-1 py-2.5 rounded-xl font-bold text-sm md:text-base bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-[0.98] transition-all shadow-lg border border-red-400/30">✅ Abschließen</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 overflow-hidden">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-600">
            <h2 className="text-lg font-bold mb-2 text-center">⚠️ Bestellung abschließen?</h2>
            <div className="mb-3 bg-gray-700/50 rounded-lg p-2">
              <label className="block text-xs text-gray-400 mb-1">Verkaufsstelle</label>
              <select value={selectedSalesPointId ?? ""} onChange={(e) => setSelectedSalesPointId(parseInt(e.target.value))} className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none">
                {salesPoints.map((sp) => (<option key={sp.id} value={sp.id}>{sp.name}</option>))}
              </select>
            </div>
            <div className="text-center mb-3">
              <p className="text-gray-300 text-sm">Gesamtbetrag:</p>
              <p className="text-3xl font-extrabold text-green-400 tabular-nums">{grandTotal.toFixed(2)} €</p>
              {netDeposit !== 0 && <p className="text-xs text-amber-400">(inkl. Pfand: {netDeposit > 0 ? "+" : ""}{netDeposit.toFixed(2)} €)</p>}
              <p className="text-xs text-gray-400">{totalDrinksCount} Getränke · {totalFoodsCount} Speisen · {items.length + foodItems.length} Positionen</p>
            </div>
            
            {hasPourDrinks && !pourSent && (
              <div className="mb-3 bg-red-900/40 border border-red-500 rounded-lg p-2 text-center">
                <p className="text-xs text-red-300 font-bold">⚠️ {pourItemCount} Zapf-Getränk(e) noch nicht an die Zapfanlage gesendet!</p>
                <p className="text-[10px] text-red-200 mt-1">Bitte erst senden, dann abschließen.</p>
              </div>
            )}
            
            {hasPourDrinks && (
              <button 
                onClick={sendToPour} 
                disabled={pourSent} 
                className={`w-full mb-3 py-2.5 rounded-lg text-sm font-bold border transition-all ${pourSent ? "bg-green-600 border-green-400 text-white cursor-default" : "bg-orange-600 hover:bg-orange-500 border-orange-400/40 text-white"}`}
              >
                {pourSent ? "✓ An Zapfanlage gesendet" : `🍺 ${pourItemCount}× an Zapfanlage senden`}
              </button>
            )}
            <button onClick={() => setShowCalculator(true)} className="w-full mb-3 py-2 rounded-lg bg-blue-700/50 hover:bg-blue-600/50 text-blue-300 text-sm font-medium border border-blue-600/30 transition-all">🧮 Wechselgeld</button>
            <p className="text-xs text-gray-400 mb-4 text-center">Die Bestellung wird gespeichert und der Zähler auf Null zurückgesetzt.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button 
                onClick={handleReset} 
                disabled={hasPourDrinks && !pourSent}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all border ${hasPourDrinks && !pourSent ? "bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-500 border-amber-400/30"}`}
              >
                Ja, abschließen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 overflow-hidden">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-600">
            <h2 className="text-lg font-bold mb-3 text-center text-red-400">⚠️ Abbrechen?</h2>
            <div className="text-center mb-4">
              <p className="text-sm text-gray-300">Bestellung wirklich verwerfen?</p>
              {pourSent && <p className="text-xs text-amber-400 mt-1">🍺 Zapf-Daten werden storniert.</p>}
              <p className="text-xs text-gray-400 mt-1">{totalDrinksCount} Getränke · {totalFoodsCount} Speisen · {grandTotal.toFixed(2)} €</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600">Weiter</button>
              <button onClick={cancelOrder} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600">Verwerfen</button>
            </div>
          </div>
        </div>
      )}
      
      {editingItem !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 overflow-hidden">
          <div className="bg-gray-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-600">
            <h3 className="text-lg font-bold mb-3 text-center">Anzahl ändern</h3>
            <p className="text-sm text-gray-300 text-center mb-3">{editingItem.type === "drink" ? orderItems.get(editingItem.id)?.drinkName : orderFoodItems.get(editingItem.id)?.foodName}</p>
            <input type="number" min="0" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white text-lg font-bold text-center border border-gray-600 focus:border-blue-500 focus:outline-none tabular-nums mb-4" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button onClick={() => { const qty = parseInt(editQuantity); if (!isNaN(qty)) updateItemQuantity(editingItem.type, editingItem.id, qty); setEditingItem(null); }} className="flex-1 py-2.5 rounded-xl font-bold bg-amber-600">Speichern</button>
            </div>
          </div>
        </div>
      )}
      
      {showCalculator && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 overflow-hidden"><CalculatorModal total={grandTotal} onClose={() => setShowCalculator(false)} /></div>}
      
      {showSuccess && lastOrder && !handout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 overflow-hidden pointer-events-none">
          <div className="bg-green-700 text-white px-8 py-6 rounded-2xl shadow-2xl font-bold text-xl animate-bounce text-center">
            ✅ Bestellung #{lastOrder.orderId}<br/>
            <span className="text-3xl">{lastOrder.totalGross.toFixed(2)} €</span>
          </div>
        </div>
      )}
      
      {handout && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/98 p-4 overflow-hidden">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-600 max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 shrink-0">
              <h2 className="text-xl font-extrabold text-center">🥤 Ausgabe – Bestellung #{handout.orderId}</h2>
              <p className="text-xs text-gray-400 text-center mt-1">{handout.salesPointName} · {handout.totalGross.toFixed(2)} €{handout.depositReturnedCount > 0 && <span className="text-amber-400"> · {handout.depositReturnedCount} Becher zurück</span>}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {handout.items.map((item) => { 
                const done = !!handout.checked[item.drinkId]; 
                const dc = drinks.find((d) => d.id === item.drinkId)?.color || "#6B7280"; 
                return (
                  <button 
                    key={`d-${item.drinkId}`} 
                    onClick={() => setHandout((h) => h ? {...h, checked:{...h.checked, [item.drinkId]:!h.checked[item.drinkId]}} : h)} 
                    className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${done ? "bg-green-900/40 border-green-500" : "bg-gray-700/50 border-gray-600"}`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0 border border-white/30" style={{backgroundColor:dc}} />
                    <span className={`flex-1 font-bold ${done ? "line-through text-gray-400" : ""}`}>
                      {item.quantity}× {item.drinkName}{item.isPourDrink && <span className="ml-2 text-[10px] bg-orange-600 px-1.5 py-0.5 rounded text-white">ZAPF</span>}
                    </span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${done ? "bg-green-500 text-white" : "bg-gray-600 text-gray-400"}`}>✓</span>
                  </button>
                );
              })}
              {handout.foodItems.map((item) => { 
                const done = !!handout.checked[-item.foodId]; 
                const fc = foods.find((f) => f.id === item.foodId)?.color || "#10B981"; 
                return (
                  <button 
                    key={`f-${item.foodId}`} 
                    onClick={() => setHandout((h) => h ? {...h, checked:{...h.checked, [-item.foodId]:!h.checked[-item.foodId]}} : h)} 
                    className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${done ? "bg-green-900/40 border-green-500" : "bg-gray-700/50 border-gray-600"}`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0 border border-white/30" style={{backgroundColor:fc}} />
                    <span className={`flex-1 font-bold ${done ? "line-through text-gray-400" : ""}`}>{item.quantity}× {item.foodName}</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${done ? "bg-green-500 text-white" : "bg-gray-600 text-gray-400"}`}>✓</span>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-700 shrink-0">
              <div className="w-full h-2 rounded-full bg-gray-700 mb-3 overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all" 
                  style={{width: `${handoutAllItems > 0 ? (handoutCheckedCount / handoutAllItems) * 100 : 0}%`}} 
                />
              </div>
              <button 
                onClick={() => setHandout(null)} 
                disabled={!handoutAllDone} 
                className={`w-full py-3 rounded-xl font-bold transition-all ${handoutAllDone ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
              >
                {handoutAllDone ? "✅ Fertig – neue Bestellung" : "Erst alle abhaken"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalculatorModal({ total, onClose }: { total: number; onClose: () => void }) {
  const [given, setGiven] = useState(""); 
  const gn = parseFloat(given.replace(",", ".")) || 0; 
  const ch = gn - total;
  return (
    <div className="bg-gray-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-600">
      <h3 className="text-lg font-bold mb-3 text-center">🧮 Wechselgeld</h3>
      <div className="text-center mb-3">
        <div className="text-xs text-gray-400">Zu zahlen</div>
        <div className="text-2xl font-extrabold text-green-400 tabular-nums">{total.toFixed(2)} €</div>
      </div>
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Erhalten (€)</label>
        <input type="number" value={given} onChange={(e) => setGiven(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white text-lg font-bold text-center border border-gray-600 focus:border-blue-500 focus:outline-none tabular-nums" placeholder="0,00" autoFocus />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[5,10,20,50].map((a) => (<button key={a} onClick={() => setGiven(a.toFixed(2))} className="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-bold">{a} €</button>))}
      </div>
      {gn > 0 && <div className="text-center mb-3 p-2 rounded-lg bg-gray-700/50"><div className="text-xs text-gray-400">Wechselgeld</div><div className={`text-2xl font-extrabold tabular-nums ${ch >= 0 ? "text-green-400" : "text-red-400"}`}>{ch >= 0 ? "" : "-"}{Math.abs(ch).toFixed(2)} €</div></div>}
      <button onClick={onClose} className="w-full py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Schließen</button>
    </div>
  );
}
