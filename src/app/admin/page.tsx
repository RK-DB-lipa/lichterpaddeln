"use client";

import { useState, useEffect, useCallback } from "react";

type Drink = {
  id: number; name: string; priceNet: number; taxRate: number;
  hasDeposit: boolean; depositAmount: number; cupSize: string;
  color: string; imageUrl: string | null; isActive: boolean;
  sortOrder: number; priceGross: number; isPourDrink: boolean;
};
type SalesPoint = { id: number; name: string; isActive: boolean; sortOrder: number };
type OrderItemSummary = { drinkName: string; totalQuantity: number; totalGross: number; totalDeposit: number };
type OrderTotals = { totalOrders: number; totalRevenue: number; totalDepositsCharged: number; totalDepositsReturned: number; netDeposits: number };
type Order = { id: number; salesPointId: number; totalGross: number; totalDeposit: number; totalDepositReturned: number; netDeposit: number; createdAt: string };
type PourStat = { drinkName: string; totalPoured: number };
type CupCounter = { salesPointId: number; given02: number; given04: number; returned02: number; returned04: number };
type SessionInfo = { authenticated: boolean; role?: string; username?: string; tenantId?: number };

const EMPTY_DRINK = { name: "", priceNet: "", taxRate: "19", hasDeposit: true, depositAmount: "2.00", cupSize: "04", color: "#3B82F6", imageUrl: "", sortOrder: "0", isPourDrink: false };

export default function AdminPage() {
  const [session, setSession] = useState<SessionInfo | null | undefined>(undefined);
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [showDrinkForm, setShowDrinkForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_DRINK);
  const [formError, setFormError] = useState("");

  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [showSalesPointForm, setShowSalesPointForm] = useState(false);
  const [spFormName, setSpFormName] = useState(""); const [spFormError, setSpFormError] = useState("");
  const [editingSalesPoint, setEditingSalesPoint] = useState<SalesPoint | null>(null);
  const [spEditName, setSpEditName] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [drinkSummary, setDrinkSummary] = useState<OrderItemSummary[]>([]);
  const [totals, setTotals] = useState<OrderTotals | null>(null);
  const [activeTab, setActiveTab] = useState<"drinks" | "salesPoints" | "cups" | "orders" | "users">("drinks");
  const [orderFilter, setOrderFilter] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState(false); const [resetTarget, setResetTarget] = useState("");
  const [pourStats, setPourStats] = useState<PourStat[]>([]);
  const [showPourResetConfirm, setShowPourResetConfirm] = useState(false);
  const [cupCounters, setCupCounters] = useState<CupCounter[]>([]);
  const [showCupResetConfirm, setShowCupResetConfirm] = useState(false); const [cupResetTarget, setCupResetTarget] = useState("");

  const checkAuth = useCallback(async () => {
    try { const res = await fetch("/api/auth/me"); if (res.ok) setSession(await res.json()); else setSession(null); }
    catch { setSession(null); }
  }, []);

  const fetchDrinks = useCallback(async () => { try { const res = await fetch("/api/drinks"); if (res.ok) setDrinks(await res.json()); } catch (err) { console.error(err); } }, []);
  const fetchSalesPoints = useCallback(async () => { try { const res = await fetch("/api/sales-points"); if (res.ok) setSalesPoints(await res.json()); } catch (err) { console.error(err); } }, []);
  const fetchOrders = useCallback(async () => {
    try { const url = orderFilter ? `/api/orders?salesPointId=${orderFilter}` : "/api/orders"; const res = await fetch(url); if (res.ok) { const data = await res.json(); setOrders(data.orders || []); setDrinkSummary(data.drinkSummary || []); setTotals(data.totals || null); } } catch (err) { console.error(err); }
  }, [orderFilter]);
  const fetchPourStats = useCallback(async () => { try { const res = await fetch("/api/pour/stats"); if (res.ok) setPourStats(await res.json()); } catch (err) { console.error(err); } }, []);
  const fetchCupCounters = useCallback(async () => { try { const res = await fetch("/api/cups"); if (res.ok) setCupCounters(await res.json()); } catch (err) { console.error(err); } }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (session) { fetchDrinks(); fetchSalesPoints(); fetchOrders(); fetchPourStats(); fetchCupCounters(); } }, [session, fetchDrinks, fetchSalesPoints, fetchOrders, fetchPourStats, fetchCupCounters]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (res.ok) { setSession({ authenticated: true }); setUsername(""); setPassword(""); }
      else { const data = await res.json(); setLoginError(data.error || "Anmeldung fehlgeschlagen"); }
    } catch { setLoginError("Verbindungsfehler"); }
  }

  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); setSession(null); }

  async function api(path: string, method: string, body?: any) {
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error((await res.json()).error || "API-Fehler");
    return res.json();
  }

  async function handleSaveDrink(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!formData.name || !formData.priceNet) { setFormError("Name und Nettopreis erforderlich"); return; }
    try {
      const payload = { name: formData.name, priceNet: parseFloat(formData.priceNet), taxRate: parseFloat(formData.taxRate), hasDeposit: formData.hasDeposit, depositAmount: parseFloat(formData.depositAmount), cupSize: formData.cupSize, color: formData.color, imageUrl: formData.imageUrl || null, sortOrder: parseInt(formData.sortOrder) || 0, isPourDrink: formData.isPourDrink };
      if (editingDrink) await api(`/api/drinks/${editingDrink.id}`, "PUT", payload);
      else await api("/api/drinks", "POST", payload);
      setShowDrinkForm(false); fetchDrinks();
    } catch (err: any) { setFormError(err.message); }
  }

  async function handleDeleteDrink(id: number) {
    if (!confirm("Getränk deaktivieren?")) return;
    try { await api(`/api/drinks/${id}`, "DELETE"); fetchDrinks(); } catch (err) { console.error(err); }
  }

  async function handleSaveSalesPoint(e: React.FormEvent) {
    e.preventDefault(); setSpFormError("");
    if (!spFormName.trim()) { setSpFormError("Name erforderlich"); return; }
    try { await api("/api/sales-points", "POST", { name: spFormName.trim() }); setShowSalesPointForm(false); setSpFormName(""); fetchSalesPoints(); }
    catch (err: any) { setSpFormError(err.message); }
  }

  async function handleUpdateSalesPoint(e: React.FormEvent) {
    e.preventDefault(); if (!editingSalesPoint || !spEditName.trim()) return;
    try { await api(`/api/sales-points/${editingSalesPoint.id}`, "PUT", { name: spEditName.trim() }); setEditingSalesPoint(null); setSpEditName(""); fetchSalesPoints(); }
    catch (err) { console.error(err); }
  }

  async function handleDeleteSalesPoint(id: number) {
    if (!confirm("Verkaufsstelle deaktivieren?")) return;
    try { await api(`/api/sales-points/${id}`, "DELETE"); fetchSalesPoints(); } catch (err) { console.error(err); }
  }

  async function handleResetOrders() {
    try { await api("/api/admin/reset", "POST", resetTarget ? { salesPointId: parseInt(resetTarget) } : {}); setShowResetConfirm(false); setResetTarget(""); fetchOrders(); }
    catch (err) { console.error(err); }
  }

  async function handleResetPour() {
    try { await api("/api/pour/reset", "POST"); setShowPourResetConfirm(false); fetchPourStats(); }
    catch (err) { console.error(err); }
  }

  async function handleResetCups() {
    try { await api("/api/cups/reset", "POST", cupResetTarget ? { salesPointId: parseInt(cupResetTarget) } : {}); setShowCupResetConfirm(false); setCupResetTarget(""); fetchCupCounters(); }
    catch (err) { console.error(err); }
  }

  const getSalesPointName = (id: number) => salesPoints.find((sp) => sp.id === id)?.name || `ID ${id}`;
  const cupTotals = cupCounters.reduce((a, c) => ({ given02: a.given02 + c.given02, given04: a.given04 + c.given04, returned02: a.returned02 + c.returned02, returned04: a.returned04 + c.returned04 }), { given02: 0, given04: 0, returned02: 0, returned04: 0 });

  if (session === undefined) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 Admin-Anmeldung</h1>
          {loginError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>}
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-400 mb-1">Benutzername</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Passwort</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all">Anmelden</button>
            <a href="/" className="block text-center text-sm text-gray-400 hover:text-white">← Zurück zur Kasse</a>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-bold">⚙️ Admin-Bereich</h1>
          {session.role === "user" && <span className="text-[10px] bg-purple-700/60 border border-purple-500/40 rounded-full px-2 py-0.5 text-purple-200 truncate">👤 {session.username}</span>}
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-blue-400 hover:underline">← Kasse</a>
          <a href="/zapf" className="text-sm text-green-400 hover:underline">Zapfen →</a>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Abmelden</button>
        </div>
      </header>

      <div className="flex border-b border-gray-700 shrink-0">
        {[
          ["drinks", "🍺 Getränke"], ["salesPoints", "🏪 Verkaufsstellen"],
          ["cups", "🥤 Becher"], ["orders", "📊 Bestellungen"],
          ...(session.role === "admin" ? [["users", "👥 Nutzer"]] : []),
        ].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === tab ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"}`}>{label}</button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-4xl mx-auto w-full overflow-y-auto">
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Getränke</h2>
              <button onClick={() => { setEditingDrink(null); setFormData(EMPTY_DRINK); setFormError(""); setShowDrinkForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Getränk</button></div>
            <div className="space-y-2">{drinks.map((d) => (
              <div key={d.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: d.color }}>{d.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="font-bold truncate flex items-center gap-2">{d.name}{d.isPourDrink && <span className="text-[10px] bg-orange-600 px-1.5 py-0.5 rounded text-white">ZAPF</span>}</div>
                  <div className="text-xs text-gray-400">Brutto: {d.priceGross.toFixed(2)} € · {d.taxRate}% MwSt.{d.hasDeposit ? ` · Pfand: ${d.depositAmount.toFixed(2)} € · ${d.cupSize === "02" ? "0,2L" : "0,4L"}` : " · Kein Pfand"}</div></div>
                <button onClick={() => { setEditingDrink(d); setFormData({ name: d.name, priceNet: d.priceNet.toString(), taxRate: d.taxRate.toString(), hasDeposit: d.hasDeposit, depositAmount: d.depositAmount.toString(), cupSize: d.cupSize, color: d.color, imageUrl: d.imageUrl || "", sortOrder: d.sortOrder.toString(), isPourDrink: d.isPourDrink }); setFormError(""); setShowDrinkForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                <button onClick={() => handleDeleteDrink(d.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
              </div>
            ))}{drinks.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Getränke angelegt.</p>}</div>
          </div>
        )}

        {activeTab === "salesPoints" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Verkaufsstellen</h2>
              <button onClick={() => { setSpFormName(""); setSpFormError(""); setShowSalesPointForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Verkaufsstelle</button></div>
            <div className="space-y-2">{salesPoints.map((sp) => (
              <div key={sp.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-blue-600">{sp.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="font-bold truncate">{sp.name}</div><div className="text-xs text-gray-400">Sortierung: {sp.sortOrder}</div></div>
                <button onClick={() => { setEditingSalesPoint(sp); setSpEditName(sp.name); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                <button onClick={() => handleDeleteSalesPoint(sp.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
              </div>
            ))}{salesPoints.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Verkaufsstellen angelegt.</p>}</div>
          </div>
        )}

        {activeTab === "cups" && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2"><h2 className="text-lg font-bold">Becher-Übersicht</h2>
              <button onClick={() => { setCupResetTarget(""); setShowCupResetConfirm(true); }} className="px-3 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-sm font-bold border border-red-500/30">🔄 Alle Becher-Zähler nullen</button></div>
            <h3 className="text-md font-bold mb-2">Gesamt</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,2L raus</div><div className="text-2xl font-bold tabular-nums">{cupTotals.given02}</div></div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,2L zurück</div><div className="text-2xl font-bold tabular-nums text-amber-400">{cupTotals.returned02}</div></div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,4L raus</div><div className="text-2xl font-bold tabular-nums">{cupTotals.given04}</div></div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">0,4L zurück</div><div className="text-2xl font-bold tabular-nums text-amber-400">{cupTotals.returned04}</div></div>
            </div>
            <h3 className="text-md font-bold mb-2">Pro Verkaufsstelle</h3>
            {cupCounters.map((c) => (
              <div key={c.salesPointId} className="bg-gray-800 rounded-xl p-3 border border-gray-700 mb-2">
                <div className="flex items-center justify-between mb-2"><div className="font-bold">{getSalesPointName(c.salesPointId)}</div>
                  <button onClick={() => { setCupResetTarget(String(c.salesPointId)); setShowCupResetConfirm(true); }} className="px-2.5 py-1 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold border border-red-500/30">🔄 nullen</button></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-700/50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">0,2L</div>
                    <div className="text-xs flex justify-between"><span className="text-gray-400">raus:</span><span className="font-bold tabular-nums">{c.given02}</span></div>
                    <div className="text-xs flex justify-between"><span className="text-gray-400">zurück:</span><span className="font-bold tabular-nums text-amber-400">{c.returned02}</span></div>
                    <div className="text-xs flex justify-between border-t border-gray-600 mt-1 pt-1"><span className="text-gray-400">im Umlauf:</span><span className={`font-bold tabular-nums ${c.given02 - c.returned02 > 0 ? "text-red-400" : "text-green-400"}`}>{c.given02 - c.returned02}</span></div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2.5">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">0,4L</div>
                    <div className="text-xs flex justify-between"><span className="text-gray-400">raus:</span><span className="font-bold tabular-nums">{c.given04}</span></div>
                    <div className="text-xs flex justify-between"><span className="text-gray-400">zurück:</span><span className="font-bold tabular-nums text-amber-400">{c.returned04}</span></div>
                    <div className="text-xs flex justify-between border-t border-gray-600 mt-1 pt-1"><span className="text-gray-400">im Umlauf:</span><span className={`font-bold tabular-nums ${c.given04 - c.returned04 > 0 ? "text-red-400" : "text-green-400"}`}>{c.given04 - c.returned04}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Bestellübersicht</h2>
            {pourStats.length > 0 && (
              <div className="mb-6 bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex justify-between items-center mb-3"><h3 className="text-md font-bold">🍺 Zapf-Statistik</h3>
                  <button onClick={() => setShowPourResetConfirm(true)} className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-xs font-bold border border-red-500/30">🔄 Zapf-Zähler nullen</button></div>
                <div className="grid grid-cols-3 gap-3">{pourStats.map((s) => (
                  <div key={s.drinkName} className="bg-gray-700/50 rounded-lg p-3 text-center"><div className="text-xs text-gray-400">{s.drinkName}</div><div className="text-2xl font-bold text-green-400">{s.totalPoured}</div><div className="text-[10px] text-gray-500">gezapft</div></div>
                ))}</div>
              </div>
            )}
            <div className="mb-4 flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]"><label className="block text-xs text-gray-400 mb-1">Filter</label>
                <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="w-full max-w-xs bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none">
                  <option value="">Alle</option>{salesPoints.map((sp) => (<option key={sp.id} value={sp.id}>{sp.name}</option>))}
                </select></div>
              <div className="flex gap-2">
                {orderFilter && <button onClick={() => { setResetTarget(orderFilter); setShowResetConfirm(true); }} className="px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold border border-red-500/30">🔄 {getSalesPointName(parseInt(orderFilter))} zurücksetzen</button>}
                <button onClick={() => { setResetTarget(""); setShowResetConfirm(true); }} className="px-3 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-sm font-bold border border-red-500/30">🔄 Alle zurücksetzen</button>
              </div>
            </div>
            {totals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">Bestellungen</div><div className="text-2xl font-bold">{totals.totalOrders}</div></div>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">Umsatz</div><div className="text-2xl font-bold text-green-400">{(totals.totalRevenue || 0).toFixed(2)} €</div></div>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">Pfand ein</div><div className="text-2xl font-bold text-amber-400">{(totals.totalDepositsCharged || 0).toFixed(2)} €</div></div>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="text-xs text-gray-400">Pfand aus</div><div className="text-2xl font-bold text-red-400">-{(totals.totalDepositsReturned || 0).toFixed(2)} €</div></div>
              </div>
            )}
            {drinkSummary.length > 0 && (
              <div className="mb-6"><h3 className="text-md font-bold mb-2">Zusammenfassung</h3>
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"><table className="w-full text-sm">
                  <thead><tr className="text-gray-400 text-xs bg-gray-700/50"><th className="text-left p-3 font-medium">Getränk</th><th className="text-right p-3 font-medium">Menge</th><th className="text-right p-3 font-medium">Umsatz</th><th className="text-right p-3 font-medium">Pfand</th></tr></thead>
                  <tbody>{drinkSummary.map((item, i) => (
                    <tr key={i} className="border-t border-gray-700/50"><td className="p-3 font-medium">{item.drinkName}</td><td className="p-3 text-right tabular-nums">{item.totalQuantity}</td>
                      <td className="p-3 text-right tabular-nums text-green-400">{(item.totalGross || 0).toFixed(2)} €</td><td className="p-3 text-right tabular-nums text-amber-400">{(item.totalDeposit || 0).toFixed(2)} €</td></tr>
                  ))}</tbody></table></div>
              </div>
            )}
            <h3 className="text-md font-bold mb-2">Einzelbestellungen</h3>
            {orders.map((o) => (
              <div key={o.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 mb-2 flex items-center justify-between">
                <div><div className="font-bold text-sm">Bestellung #{o.id}</div><div className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString("de-DE")}</div><div className="text-xs text-blue-400 mt-0.5">{getSalesPointName(o.salesPointId)}</div></div>
                <div className="text-right"><div className="font-bold text-green-400">{o.totalGross.toFixed(2)} €</div><div className="text-xs text-gray-400">Pfand: {o.totalDeposit.toFixed(2)} €{o.totalDepositReturned > 0 && ` (−${o.totalDepositReturned.toFixed(2)} € zurück)`}</div></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "users" && session.role === "admin" && <UsersTab />}
      </div>

      {/* Modals */}
      {showDrinkForm && <DrinkFormModal editingDrink={editingDrink} formData={formData} formError={formError} setFormData={setFormData} handleSave={handleSaveDrink} onClose={() => setShowDrinkForm(false)} />}
      {showSalesPointForm && <SimpleModal title="Neue Verkaufsstelle" error={spFormError} value={spFormName} onChange={setSpFormName} onSubmit={handleSaveSalesPoint} onClose={() => setShowSalesPointForm(false)} />}
      {editingSalesPoint && <SimpleModal title="Verkaufsstelle bearbeiten" error="" value={spEditName} onChange={setSpEditName} onSubmit={handleUpdateSalesPoint} onClose={() => setEditingSalesPoint(null)} />}
      {showResetConfirm && <ConfirmModal title="⚠️ Zähler zurücksetzen?" onConfirm={handleResetOrders} onClose={() => setShowResetConfirm(false)}><p className="text-sm text-gray-300 text-center">{resetTarget ? `Alle Bestellungen für "${getSalesPointName(parseInt(resetTarget))}" werden unwiderruflich gelöscht.` : "ALLE Bestellungen werden unwiderruflich gelöscht."}</p></ConfirmModal>}
      {showPourResetConfirm && <ConfirmModal title="⚠️ Zapf-Zähler nullen?" onConfirm={handleResetPour} onClose={() => setShowPourResetConfirm(false)}><p className="text-sm text-gray-300 text-center">Zapf-Statistiken und offene Aufträge werden gelöscht.</p></ConfirmModal>}
      {showCupResetConfirm && <ConfirmModal title="⚠️ Becher-Zähler nullen?" onConfirm={handleResetCups} onClose={() => setShowCupResetConfirm(false)}><p className="text-sm text-gray-300 text-center">{cupResetTarget ? `Becher-Zähler für "${getSalesPointName(parseInt(cupResetTarget))}" werden gelöscht.` : "ALLE Becher-Zähler werden gelöscht."}</p></ConfirmModal>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function DrinkFormModal({
  editingDrink, formData, formError, setFormData, handleSave, onClose
}: { editingDrink: any; formData: any; formError: string; setFormData: any; handleSave: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={handleSave} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{editingDrink ? "Getränk bearbeiten" : "Neues Getränk"}</h2>
        {formError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{formError}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="Pils" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Netto (€) *</label>
              <input type="number" step="0.01" value={formData.priceNet} onChange={(e) => setFormData({...formData, priceNet: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="2.50" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">MwSt.</label>
              <select value={formData.taxRate} onChange={(e) => setFormData({...formData, taxRate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"><option value="19">19%</option><option value="7">7%</option></select></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.hasDeposit} onChange={(e) => setFormData({...formData, hasDeposit: e.target.checked})} className="w-5 h-5 rounded accent-amber-500" /><span className="text-sm text-gray-300">Becherpfand</span></label>
          {formData.hasDeposit && <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-400 mb-1">Pfand (€)</label>
              <input type="number" step="0.01" value={formData.depositAmount} onChange={(e) => setFormData({...formData, depositAmount: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="block text-sm text-gray-400 mb-1">Bechergröße</label>
              <select value={formData.cupSize} onChange={(e) => setFormData({...formData, cupSize: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"><option value="02">0,2 l</option><option value="04">0,4 l</option></select></div>
          </div>}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isPourDrink} onChange={(e) => setFormData({...formData, isPourDrink: e.target.checked})} className="w-5 h-5 rounded accent-orange-500" /><span className="text-sm text-gray-300">Zapfgetränk</span></label>
          <div><label className="block text-sm text-gray-400 mb-1">Farbe</label>
            <div className="flex items-center gap-3"><input type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="w-12 h-10 rounded-lg border border-gray-600 cursor-pointer" /><span className="text-sm text-gray-400 font-mono">{formData.color}</span></div></div>
          <div><label className="block text-sm text-gray-400 mb-1">Bild-URL</label>
            <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="https://..." /></div>
          <div><label className="block text-sm text-gray-400 mb-1">Sortierung</label>
            <input type="number" value={formData.sortOrder} onChange={(e) => setFormData({...formData, sortOrder: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
          <div className="rounded-xl p-4 text-white shadow-lg border border-white/10"
            style={{ backgroundColor: formData.color || "#3B82F6", backgroundImage: formData.imageUrl ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${formData.imageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="font-bold text-lg">{formData.name || "Name"}</div>
            <div className="text-2xl font-extrabold mt-1">{formData.priceNet ? (parseFloat(formData.priceNet) * (1 + parseFloat(formData.taxRate) / 100)).toFixed(2) : "0.00"} €</div>
            {formData.hasDeposit && <div className="text-sm opacity-80">+ {parseFloat(formData.depositAmount || "0").toFixed(2)} € · {formData.cupSize === "02" ? "0,2L" : "0,4L"}</div>}
            {formData.isPourDrink && <div className="text-sm text-orange-400 font-bold mt-1">🍺 Zapfgetränk</div>}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
          <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Speichern</button>
        </div>
      </form>
    </div>
  );
}

function SimpleModal({ title, error, value, onChange, onSubmit, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {error && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{error}</div>}
        <div className="mb-4"><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
          <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Speichern</button></div>
      </form>
    </div>
  );
}

function ConfirmModal({ title, children, onConfirm, onClose }: { title: string; children: React.ReactNode; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-3 text-center text-red-400">{title}</h2>
        {children}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 transition-all">Ja</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users Tab (embedded in admin page for super admin)
// ---------------------------------------------------------------------------

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState(""); const [newPassword, setNewPassword] = useState(""); const [newDays, setNewDays] = useState("30");
  const [createError, setCreateError] = useState("");
  const [extendingUser, setExtendingUser] = useState<any>(null); const [extendDays, setExtendDays] = useState("30");
  const [passwordUser, setPasswordUser] = useState<any>(null); const [pwValue, setPwValue] = useState("");

  const reload = useCallback(async () => { try { const res = await fetch("/api/users"); if (res.ok) setUsers(await res.json()); } catch (err) { console.error(err); } }, []);

  useEffect(() => { reload(); }, [reload]);

  async function api(path: string, method: string, body?: any) {
    const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error((await res.json()).error || "API-Fehler");
    return res.json();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setCreateError("");
    try { await api("/api/users", "POST", { username: newName, password: newPassword, days: parseInt(newDays) }); setShowCreate(false); setNewName(""); setNewPassword(""); setNewDays("30"); reload(); }
    catch (err: any) { setCreateError(err.message || "Fehler beim Anlegen"); }
  }

  async function handleExtend(userId: number) {
    try { await api("/api/users", "PATCH", { userId, action: "extend", value: parseInt(extendDays) }); setExtendingUser(null); reload(); }
    catch (err) { console.error(err); }
  }

  async function handlePassword(userId: number) {
    try { await api("/api/users", "PATCH", { userId, action: "resetPassword", value: pwValue }); setPasswordUser(null); setPwValue(""); }
    catch (err) { console.error(err); }
  }

  async function handleDelete(userId: number, userName: string) {
    if (!confirm(`Nutzer "${userName}" wirklich löschen? Alle Daten werden unwiderruflich gelöscht.`)) return;
    try { await api("/api/users", "DELETE", { userId }); reload(); }
    catch (err) { console.error(err); }
  }

  async function toggleActive(userId: number) {
    try { await api("/api/users", "PATCH", { userId, action: "toggleActive" }); reload(); }
    catch (err) { console.error(err); }
  }

  function daysLeft(expiresAt: string) { return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)); }

  return (
    <div>
      <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Nutzerverwaltung</h2>
        <button onClick={() => { setCreateError(""); setShowCreate(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neuer Nutzer</button></div>
      <p className="text-xs text-gray-400 mb-4">Jeder Nutzer erhält eine isolierte Umgebung mit eigenem Login, Getränken, Verkaufsstellen, Bestellungen und Zählern.</p>
      {users.map((u: any) => {
        const left = daysLeft(u.expiresAt); const expired = left < 0;
        return (
          <div key={u.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-purple-600">{u.username.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate flex items-center gap-2 flex-wrap">{u.username}
                  {!u.isActive && <span className="text-[10px] bg-gray-600 px-1.5 py-0.5 rounded text-white">DEAKTIVIERT</span>}
                  {expired && <span className="text-[10px] bg-red-700 px-1.5 py-0.5 rounded text-white">ABGELAUFEN</span>}
                </div>
                <div className="text-xs text-gray-400">Lizenz bis {new Date(u.expiresAt).toLocaleDateString("de-DE")} · {expired ? <span className="text-red-400 font-bold">abgelaufen</span> : <span className={`font-bold ${left <= 7 ? "text-amber-400" : "text-green-400"}`}>noch {left} {left === 1 ? "Tag" : "Tage"}</span>}</div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              <button onClick={() => setExtendingUser(u)} className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">⏳ Verlängern</button>
              <button onClick={() => setPasswordUser(u)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-bold">🔑 Passwort</button>
              <button onClick={() => toggleActive(u.id)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-bold">{u.isActive ? "⏸️ Deaktivieren" : "▶️ Aktivieren"}</button>
              <button onClick={() => handleDelete(u.id, u.username)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold">🗑️ Löschen</button>
            </div>
          </div>
        );
      })}
      {users.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Nutzer angelegt.</p>}

      {showCreate && <UserModal title="Neuer Nutzer" error={createError} name={newName} password={newPassword} days={newDays} onNameChange={setNewName} onPasswordChange={setNewPassword} onDaysChange={setNewDays} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
      {extendingUser && <SelectModal title="⏳ Lizenz verlängern" subtitle={`${extendingUser.username} · aktuell bis ${new Date(extendingUser.expiresAt).toLocaleDateString("de-DE")}`} value={extendDays} onChange={setExtendDays} onSubmit={() => handleExtend(extendingUser.id)} onClose={() => setExtendingUser(null)} />}
      {passwordUser && <PasswordModal user={passwordUser} value={pwValue} onChange={setPwValue} onSubmit={() => handlePassword(passwordUser.id)} onClose={() => setPasswordUser(null)} />}
    </div>
  );
}

function UserModal({ title, error, name, password, days, onNameChange, onPasswordChange, onDaysChange, onSubmit, onClose }: any) {
  const opts = [{d:1,l:"1 Tag"},{d:2,l:"2 Tage"},{d:3,l:"3 Tage"},{d:4,l:"4 Tage"},{d:14,l:"14 Tage"},{d:30,l:"30 Tage"},{d:180,l:"180 Tage"},{d:365,l:"1 Jahr"}];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {error && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{error}</div>}
        <div className="mb-3"><label className="block text-sm text-gray-400 mb-1">Name *</label><input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
        <div className="mb-3"><label className="block text-sm text-gray-400 mb-1">Passwort *</label><input type="text" value={password} onChange={(e) => onPasswordChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" /></div>
        <div className="mb-4"><label className="block text-sm text-gray-400 mb-1">Lizenzzeitraum</label>
          <select value={days} onChange={(e) => onDaysChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
            {opts.map((o:any) => (<option key={o.d} value={o.d}>{o.l}</option>))}
          </select></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
          <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Anlegen</button></div>
      </form>
    </div>
  );
}

function SelectModal({ title, subtitle, value, onChange, onSubmit, onClose }: any) {
  const opts = [{d:1,l:"1 Tag"},{d:2,l:"2 Tage"},{d:3,l:"3 Tage"},{d:4,l:"4 Tage"},{d:14,l:"14 Tage"},{d:30,l:"30 Tage"},{d:180,l:"180 Tage"},{d:365,l:"1 Jahr"}];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-gray-400 mb-4">{subtitle}</p>
        <div className="mb-4"><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
          {opts.map((o:any) => (<option key={o.d} value={o.d}>{o.l}</option>))}
        </select></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
          <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500 transition-all">Verlängern</button></div>
      </form>
    </div>
  );
}

function PasswordModal({ user, value, onChange, onSubmit, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={onSubmit} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-2">🔑 Neues Passwort</h2>
        <p className="text-sm text-gray-400 mb-4">für <span className="text-white font-bold">{user?.username}</span></p>
        <div className="mb-4"><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus /></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
          <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Speichern</button></div>
      </form>
    </div>
  );
}
