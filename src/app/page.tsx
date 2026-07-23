"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Drink = { id: number; name: string; priceGross: number; taxRate: number; hasDeposit: boolean; depositAmount: number; cupSize: string; color: string; imageUrl: string | null; isPourDrink: boolean; salesPointIds?: number[]; group?: string | null; };
type SalesPoint = { id: number; name: string; };
type OrderItem = { drinkId: number; drinkName: string; quantity: number; unitPriceGross: number; unitDeposit: number; };
type HandoutState = { orderId: number; salesPointName: string; items: Array<OrderItem & { isPourDrink: boolean }>; checked: Record<number, boolean>; totalGross: number; depositReturnedCount: number; };

const DEPOSIT_PER_RETURN = 2.0;

export default function POSPage() {
  const [session, setSession] = useState<any>(undefined);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginDisplayName, setLoginDisplayName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [selectedSalesPointId, setSelectedSalesPointId] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<Map<number, OrderItem>>(new Map());
  const [depositReturned02, setDepositReturned02] = useState(0);
  const [depositReturned04, setDepositReturned04] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
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
    fetch("/api/admin/setup", { method: "POST" }).then(() => { fetchDrinks().then(() => fetchSalesPoints()); });
  }, [session?.authenticated]);

  async function fetchDrinks() {
    try {
      const url = selectedSalesPointId ? `/api/drinks?salesPointId=${selectedSalesPointId}` : "/api/drinks";
      const r = await fetch(url); if (r.ok) setDrinks(await r.json());
    } catch (err) { console.error(err); }
  }
  async function fetchSalesPoints() {
    try { const r = await fetch("/api/sales-points"); if (r.ok) { const d = await r.json(); setSalesPoints(d); if (d.length > 0 && selectedSalesPointId === null) setSelectedSalesPointId(d[0].id); } } catch (err) { console.error(err); }
  }

  useEffect(() => { if (session?.authenticated && selectedSalesPointId) fetchDrinks(); }, [session?.authenticated, selectedSalesPointId]);

  const addDrink = useCallback((drink: Drink) => {
    if (removeMode) { setRemoveMode(false); setOrderItems((prev) => { const n = new Map(prev); const ex = n.get(drink.id); if (!ex) return n; if (ex.quantity <= 1) n.delete(drink.id); else n.set(drink.id, { ...ex, quantity: ex.quantity - 1 }); return n; }); return; }
    setPourSent(false); setOrderItems((prev) => { const n = new Map(prev); const ex = n.get(drink.id); if (ex) n.set(drink.id, { ...ex, quantity: ex.quantity + 1 }); else n.set(drink.id, { drinkId: drink.id, drinkName: drink.name, quantity: 1, unitPriceGross: drink.priceGross, unitDeposit: drink.hasDeposit ? drink.depositAmount : 0 }); return n; });
  }, [removeMode]);

  const addDepositReturn = useCallback(async (size: "02" | "04", count: number) => {
    if (selectedSalesPointId) { await fetch("/api/cups/return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesPointId: selectedSalesPointId, size, count }) }).catch(() => {}); }
    if (size === "02") setDepositReturned02((p) => p + count); else setDepositReturned04((p) => p + count);
  }, [selectedSalesPointId]);

  const removeItem = useCallback((drinkId: number) => { setOrderItems((prev) => { const n = new Map(prev); n.delete(drinkId); return n; }); }, []);
  const updateItemQuantity = useCallback((drinkId: number, newQty: number) => { if (newQty < 1) { removeItem(drinkId); return; } setOrderItems((prev) => { const n = new Map(prev); const ex = n.get(drinkId); if (ex) n.set(drinkId, { ...ex, quantity: newQty }); return n; }); }, [removeItem]);

  const cancelOrder = useCallback(async () => {
    if (pourSent && selectedSalesPointId) { const pourItems = Array.from(orderItems.values()).filter((item) => drinks.find((d) => d.id === item.drinkId)?.isPourDrink).map((item) => ({ drinkName: item.drinkName, quantity: item.quantity })); if (pourItems.length > 0) { try { await fetch("/api/pour/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salesPointId: selectedSalesPointId, items: pourItems }) }); } catch (err) { console.error(err); } } }
    setOrderItems(new Map()); setDepositReturned02(0); setDepositReturned04(0); setPourSent(false); setRemoveMode(false); setShowCancelConfirm(false);
  }, [pourSent, selectedSalesPointId, orderItems, drinks]);

  // FIX: Korrekte Preis-Kalkulation mit expliziter Rundung
  const items = Array.from(orderItems.values());
  const totalDrinkGross = +items.reduce((s, i) => s + (i.unitPriceGross * i.quantity), 0).toFixed(2);
  const totalDepositCharged = +items.reduce((s, i) => s + (i.unitDeposit * i.quantity), 0).toFixed(2);
  const depositReturned = depositReturned02 + depositReturned04;
  const totalDepositReturn = +(depositReturned * DEPOSIT_PER_RETURN).toFixed(2);
  const netDeposit = +(totalDepositCharged - totalDepositReturn).toFixed(2);
  const grandTotal = +(totalDrinkGross + netDeposit).toFixed(2);
  const hasItems = items.length > 0 || depositReturned > 0;
  const totalDrinksCount = items.reduce((s, i) => s + i.quantity, 0);
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
    if (items.length > 0) {
      try {
        const cashierName = session?.displayName || session?.username || "";
        const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((i) => ({ drinkId: i.drinkId, quantity: i.quantity })), depositReturned, salesPointId: selectedSalesPointId, cashierName }) });
        if (r.ok) { const data = await r.json(); setLastOrder({ orderId: data.orderId, totalGross: grandTotal }); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); setHandout({ orderId: data.orderId, salesPointName: selectedSalesPoint?.name || "", items: items.map((i) => ({ ...i, isPourDrink: drinks.find((d) => d.id === i.drinkId)?.isPourDrink ?? false })), checked: {}, totalGross: grandTotal, depositReturnedCount: depositReturned }); }
      } catch (err) { console.error(err); }
    }
    setOrderItems(new Map()); setDepositReturned02(0); setDepositReturned04(0); setPourSent(false); setRemoveMode(false); setShowResetConfirm(false);
  }, [items, depositReturned, grandTotal, selectedSalesPointId, selectedSalesPoint, drinks, session]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => { if (!receiptRef.current) return; setIsDragging(true); const cx = "touches" in e ? e.touches[0].clientX : e.clientX; const cy = "touches" in e ? e.touches[0].clientY : e.clientY; const r = receiptRef.current.getBoundingClientRect(); dragOffset.current = { x: cx - r.left, y: cy - r.top }; };
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !receiptRef.current || !receiptRef.current.parentElement) return;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    const panel = receiptRef.current;
    const container = receiptRef.current.parentElement.getBoundingClientRect();
    const rect = panel.getBoundingClientRect();
    // Bounds: Bon darf Container nicht verlassen
    let nx = cx - dragOffset.current.x - container.left;
    let ny = cy - dragOffset.current.y - container.top;
    nx = Math.max(0, Math.min(nx, container.width - rect.width));
    ny = Math.max(0, Math.min(ny, container.height - rect.height));
    setReceiptPos({ x: nx, y: ny });
  }, [isDragging]);
  const handleDragEnd = useCallback(() => setIsDragging(false), []);
  useEffect(() => { if (isDragging) { window.addEventListener("mousemove", handleDragMove); window.addEventListener("mouseup", handleDragEnd); window.addEventListener("touchmove", handleDragMove); window.addEventListener("touchend", handleDragEnd); return () => { window.removeEventListener("mousemove", handleDragMove); window.removeEventListener("mouseup", handleDragEnd); window.removeEventListener("touchmove", handleDragMove); window.removeEventListener("touchend", handleDragEnd); }; } }, [isDragging, handleDragMove, handleDragEnd]);

  const handoutCheckedCount = handout ? handout.items.filter((i) => handout.checked[i.drinkId]).length : 0;
  const handoutAllDone = handout !== null && handoutCheckedCount === handout.items.length;

  if (session === undefined) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;

  if (!session?.authenticated) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center p-4">
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

  // Gruppierungs-Logik: Trennlinien zwischen verschiedenen Gruppen
  const drinkRows: Array<{ type: "drink" | "separator"; drink?: Drink; group?: string; id: string }> = [];
  let lastGroup: string | null = "__INITIAL__";
  for (const drink of drinks) {
    const currentGroup = drink.group || null;
    if (currentGroup && currentGroup !== lastGroup && drinkRows.length > 0) {
      drinkRows.push({ type: "separator", group: currentGroup, id: `sep-${currentGroup}` });
    }
    drinkRows.push({ type: "drink", drink, id: `d-${drink.id}` });
    lastGroup = currentGroup;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <header className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/images/turbotap-logo.png" alt="" className="w-6 h-6 rounded" />
          <span className="font-bold text-sm md:text-base truncate">TurboTap · {selectedSalesPoint?.name || "Getränkewagen"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-gray-700 rounded px-1.5 py-0.5 text-gray-300 hidden sm:inline">👤 {session.displayName || session.username}</span>
          <a href="/zapf" className="text-xs bg-gray-700 hover:bg-gray-600 rounded-lg px-2 py-1 border border-gray-600 font-bold transition-colors">🍺 Zapf</a>
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
          {removeMode && <div className="bg-red-700/60 border border-red-500 rounded-lg px-2 py-1 mb-1.5 text-xs font-bold text-center animate-pulse">⚡ Entfernen-Modus aktiv</div>}
          {drinks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500"><div className="text-center"><p className="text-lg mb-2">Keine Getränke an dieser Stelle</p><a href="/admin" className="text-blue-400 underline text-sm">Admin</a></div></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-2">
              {drinkRows.map((row) => {
                if (row.type === "separator") {
                  return (
                    <div key={row.id} className="col-span-full flex items-center gap-2 my-1">
                      <span className="h-px flex-1 bg-gray-600" />
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{row.group}</span>
                      <span className="h-px flex-1 bg-gray-600" />
                    </div>
                  );
                }
                const drink = row.drink!;
                const count = orderItems.get(drink.id)?.quantity || 0;
                return (
                  <button key={drink.id} onClick={() => addDrink(drink)} className={`relative rounded-xl p-2 md:p-3 text-left active:scale-[0.97] transition-all shadow-md border ${removeMode && count > 0 ? "border-red-400 border-2" : "border-white/10 hover:border-white/30"} min-h-[80px] md:min-h-[100px] flex flex-col justify-between`}
                    style={{ backgroundColor: drink.color, backgroundImage: drink.imageUrl ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${drink.imageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
                    {count > 0 && <div className="absolute -top-1.5 -right-1.5 bg-white text-gray-900 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center font-extrabold text-sm shadow-lg border border-gray-200">{count}</div>}
                    {removeMode && count > 0 && <div className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-black text-xs shadow-lg">−</div>}
                    <div className="font-extrabold text-sm md:text-base leading-tight drop-shadow-md">{drink.name}</div>
                    <div className="mt-auto"><div className="text-lg md:text-xl font-extrabold drop-shadow-md">{drink.priceGross.toFixed(2)} €</div>{drink.hasDeposit && <div className="text-[10px] opacity-80 mt-0.5 drop-shadow">+ {drink.depositAmount.toFixed(2)} € Pfand</div>}<div className="text-[9px] opacity-60 mt-0.5">{drink.taxRate}% MwSt.</div></div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {hasItems && (
          <div ref={receiptRef} className={`absolute z-40 shadow-2xl border-2 border-gray-500 rounded-xl overflow-hidden select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${receiptMinimized ? "w-auto" : "w-72 md:w-80"}`}
            style={{ left: receiptPos.x || "auto", top: receiptPos.y || "auto", right: receiptPos.x ? undefined : 8, bottom: receiptPos.y ? undefined : 8 }}>
            <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="bg-gray-700 px-3 py-2 flex items-center justify-between border-b border-gray-600">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1">🖐️ {totalDrinksCount} Getränke</span>
              <div className="flex items-center gap-1"><button onClick={() => setReceiptMinimized((p) => !p)} className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500">{receiptMinimized ? "▲" : "▼"}</button><button onClick={() => { setReceiptPos({ x:0, y:0 }); setReceiptMinimized(false); }} className="text-gray-400 hover:text-white text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500">⌂</button></div>
            </div>
            {!receiptMinimized && (
              <div className="bg-gray-800">
                <div className="px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                  {items.map((item) => (<div key={item.drinkId} className="flex justify-between items-center text-sm md:text-base border-b border-gray-700/40 py-1">
                    <span className="flex-1 min-w-0 truncate font-medium flex items-center gap-1.5"><button onClick={() => { setEditingItem(item.drinkId); setEditQuantity(item.quantity.toString()); }} className="text-blue-400 hover:text-blue-300 text-xs underline shrink-0">✎</button><span className="truncate">{item.drinkName} <span className="text-gray-400 text-xs">×{item.quantity}</span></span></span>
                    <span className="tabular-nums font-semibold text-sm md:text-base">{(item.unitPriceGross * item.quantity).toFixed(2)} €</span>
                    <button onClick={() => removeItem(item.drinkId)} className="ml-1.5 text-red-400 hover:text-red-300 text-sm px-1 shrink-0">✕</button>
                  </div>))}
                  {totalDepositCharged > 0 && <div className="flex justify-between items-baseline text-sm md:text-base py-1 text-amber-400"><span>Pfand (behalten)</span><span className="tabular-nums font-semibold">+{totalDepositCharged.toFixed(2)} €</span></div>}
                  {depositReturned > 0 && <div className="flex justify-between items-baseline text-sm md:text-base py-1 text-red-400"><span>Pfand zurück ({depositReturned02>0 && `${depositReturned02}× 0,2l`}{depositReturned02>0 && depositReturned04>0 && " + "}{depositReturned04>0 && `${depositReturned04}× 0,4l`})</span><span className="tabular-nums font-semibold">-{totalDepositReturn.toFixed(2)} €</span></div>}
                </div>
                <div className="border-t border-gray-600 px-3 py-2 bg-gray-700/50">
                  <div className="flex justify-between items-center text-sm md:text-base"><span className="text-gray-300">Getränke: <span className="tabular-nums font-bold">{totalDrinkGross.toFixed(2)} €</span></span>{netDeposit !== 0 && <span className="text-amber-400 text-xs md:text-sm">Pfand: {netDeposit > 0 ? "+" : ""}<span className="tabular-nums">{netDeposit.toFixed(2)} €</span></span>}</div>
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

      {showResetConfirm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-600"><h2 className="text-lg font-bold mb-2 text-center">⚠️ Bestellung abschließen?</h2><div className="mb-3 bg-gray-700/50 rounded-lg p-2"><label className="block text-xs text-gray-400 mb-1">Verkaufsstelle</label><select value={selectedSalesPointId ?? ""} onChange={(e) => setSelectedSalesPointId(parseInt(e.target.value))} className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none">{salesPoints.map((sp) => (<option key={sp.id} value={sp.id}>{sp.name}</option>))}</select></div><div className="text-center mb-3"><p className="text-gray-300 text-sm">Gesamtbetrag:</p><p className="text-3xl font-extrabold text-green-400 tabular-nums">{grandTotal.toFixed(2)} €</p>{netDeposit !== 0 && <p className="text-xs text-amber-400">(inkl. Pfand: {netDeposit > 0 ? "+" : ""}{netDeposit.toFixed(2)} €)</p>}<p className="text-xs text-gray-400">{totalDrinksCount} Getränke · {items.length} Positionen · {session?.displayName || session?.username}</p></div>{hasPourDrinks && <button onClick={sendToPour} disabled={pourSent} className={`w-full mb-3 py-2.5 rounded-lg text-sm font-bold border transition-all ${pourSent ? "bg-green-600 border-green-400 text-white cursor-default" : "bg-orange-600 hover:bg-orange-500 border-orange-400/40 text-white"}`}>{pourSent ? "✓ An Zapfanlage gesendet" : `🍺 ${pourItemCount}× an Zapfanlage senden`}</button>}<button onClick={() => setShowCalculator(true)} className="w-full mb-3 py-2 rounded-lg bg-blue-700/50 hover:bg-blue-600/50 text-blue-300 text-sm font-medium border border-blue-600/30 transition-all">🧮 Wechselgeld</button><p className="text-xs text-gray-400 mb-4 text-center">Bestellung speichern und Zähler zurücksetzen.</p><div className="flex gap-3"><button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button><button onClick={handleReset} className="flex-1 py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 transition-all border border-amber-400/30">Ja, abschließen</button></div></div></div>)}
      {showCancelConfirm && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"><div className="bg-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-gray-600"><h2 className="text-lg font-bold mb-3 text-center text-red-400">⚠️ Abbrechen?</h2><div className="text-center mb-4"><p className="text-sm text-gray-300">Bestellung wirklich verwerfen?</p>{pourSent && <p className="text-xs text-amber-400 mt-1">🍺 Zapf-Daten werden storniert.</p>}<p className="text-xs text-gray-400 mt-1">{totalDrinksCount} Getränke · {grandTotal.toFixed(2)} €</p></div><div className="flex gap-3"><button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600">Weiter</button><button onClick={cancelOrder} className="flex-1 py-2.5 rounded-xl font-bold bg-red-600">Verwerfen</button></div></div></div>)}
      {editingItem !== null && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="bg-gray-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-600"><h3 className="text-lg font-bold mb-3 text-center">Anzahl ändern</h3><p className="text-sm text-gray-300 text-center mb-3">{orderItems.get(editingItem)?.drinkName}</p><input type="number" min="0" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white text-lg font-bold text-center border border-gray-600 focus:border-blue-500 focus:outline-none tabular-nums mb-4" autoFocus /><div className="flex gap-3"><button onClick={() => setEditingItem(null)} className="flex-1 py-2.5 rounded-xl font-bold bg-gray-600">Abbrechen</button><button onClick={() => { const qty = parseInt(editQuantity); if (!isNaN(qty)) updateItemQuantity(editingItem, qty); setEditingItem(null); }} className="flex-1 py-2.5 rounded-xl font-bold bg-amber-600">Speichern</button></div></div></div>)}
      {showCalculator && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"><CalculatorModal total={grandTotal} onClose={() => setShowCalculator(false)} /></div>}
      {showSuccess && lastOrder && !handout && (<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-2xl font-bold text-sm animate-bounce">✅ #{lastOrder.orderId} – {lastOrder.totalGross.toFixed(2)} €</div>)}
      {handout && (<div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/95 p-4"><div className="bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-600 max-h-[92vh] flex flex-col"><div className="p-4 border-b border-gray-700 shrink-0"><h2 className="text-xl font-extrabold text-center">🥤 Ausgabe – Bestellung #{handout.orderId}</h2><p className="text-xs text-gray-400 text-center mt-1">{handout.salesPointName} · {handout.totalGross.toFixed(2)} €{handout.depositReturnedCount > 0 && <span className="text-amber-400"> · {handout.depositReturnedCount} Becher zurück</span>}</p></div><div className="flex-1 overflow-y-auto p-3 space-y-2">{handout.items.map((item) => { const done = !!handout.checked[item.drinkId]; const dc = drinks.find((d) => d.id === item.drinkId)?.color || "#6B7280"; return (<button key={item.drinkId} onClick={() => setHandout((h) => h ? {...h, checked:{...h.checked, [item.drinkId]:!h.checked[item.drinkId]}} : h)} className={`w-full flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${done ? "bg-green-900/40 border-green-500" : "bg-gray-700/50 border-gray-600"}`}><span className="w-4 h-4 rounded-full shrink-0 border border-white/30" style={{backgroundColor:dc}} /><span className={`flex-1 font-bold ${done ? "line-through text-gray-400" : ""}`}>{item.quantity}× {item.drinkName}{item.isPourDrink && <span className="ml-2 text-[10px] bg-orange-600 px-1.5 py-0.5 rounded text-white">ZAPF</span>}</span><span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${done ? "bg-green-500 text-white" : "bg-gray-600 text-gray-400"}`}>✓</span></button>);})}</div><div className="p-4 border-t border-gray-700 shrink-0"><div className="w-full h-2 rounded-full bg-gray-700 mb-3 overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{width: `${handout.items.length > 0 ? (handoutCheckedCount / handout.items.length) * 100 : 0}%`}} /></div><button onClick={() => setHandout(null)} disabled={!handoutAllDone} className={`w-full py-3 rounded-xl font-bold transition-all ${handoutAllDone ? "bg-green-600 hover:bg-green-500" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>{handoutAllDone ? "✅ Fertig – neue Bestellung" : "Erst alle abhaken"}</button></div></div></div>)}
    </div>
  );
}

function CalculatorModal({ total, onClose }: { total: number; onClose: () => void }) {
  const [given, setGiven] = useState(""); const gn = parseFloat(given.replace(",", ".")) || 0; const ch = gn - total;
  return (<div className="bg-gray-800 rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-gray-600"><h3 className="text-lg font-bold mb-3 text-center">🧮 Wechselgeld</h3><div className="text-center mb-3"><div className="text-xs text-gray-400">Zu zahlen</div><div className="text-2xl font-extrabold text-green-400 tabular-nums">{total.toFixed(2)} €</div></div><div className="mb-3"><label className="block text-xs text-gray-400 mb-1">Erhalten (€)</label><input type="number" value={given} onChange={(e) => setGiven(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white text-lg font-bold text-center border border-gray-600 focus:border-blue-500 focus:outline-none tabular-nums" placeholder="0,00" autoFocus /></div><div className="grid grid-cols-4 gap-2 mb-3">{[5,10,20,50].map((a) => (<button key={a} onClick={() => setGiven(a.toFixed(2))} className="py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-bold">{a} €</button>))}</div>{gn > 0 && <div className="text-center mb-3 p-2 rounded-lg bg-gray-700/50"><div className="text-xs text-gray-400">Wechselgeld</div><div className={`text-2xl font-extrabold tabular-nums ${ch >= 0 ? "text-green-400" : "text-red-400"}`}>{ch >= 0 ? "" : "-"}{Math.abs(ch).toFixed(2)} €</div></div>}<button onClick={onClose} className="w-full py-2.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-500">Schließen</button></div>);
}
