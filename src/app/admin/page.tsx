"use client";
import { useState, useEffect, useCallback } from "react";

type Drink = { id: number; name: string; priceGross: number; taxRate: number; hasDeposit: boolean; depositAmount: number; cupSize: string; color: string; imageUrl: string | null; isActive: boolean; sortOrder: number; isPourDrink: boolean; salesPointIds?: number[]; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type Food = { id: number; name: string; priceGross: number; taxRate: number; color: string; imageUrl: string | null; isActive: boolean; isCookItem: boolean; sortOrder: number; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type SalesPoint = { id: number; name: string; isActive: boolean; sortOrder: number; };
type Order = { id: number; salesPointId: number; totalGross: number; totalDeposit: number; totalDepositReturned: number; netDeposit: number; cashierName?: string; createdAt: string; };
type Event = { id: number; name: string; startDate: string; endDate: string; isActive: boolean; drinkCount: number; foodCount: number; };
type TenantInfo = { userId: number; username: string; isActive: boolean; expiresAt: string; drinks: number; orders: number; pours: number; };
type PriceReduction = { id: number; itemId: number; itemType: "drink" | "food"; startTime: string; endTime: string; reductionPercent: number; isActive: boolean; };

const EMPTY_DRINK = { name: "", priceGross: "", taxRate: "19", hasDeposit: true, depositAmount: "2.00", cupSize: "04", color: "#3B82F6", imageUrl: "", sortOrder: "0", isPourDrink: false, salesPointIds: [] as number[], group: "" };

export default function AdminPage() {
  const [session, setSession] = useState<any>(undefined);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [priceReductions, setPriceReductions] = useState<PriceReduction[]>([]);
  const [activeTab, setActiveTab] = useState<string>("drinks");
  
  // Forms
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [showDrinkForm, setShowDrinkForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_DRINK);
  const [formError, setFormError] = useState("");
  
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [foodFormData, setFoodFormData] = useState({ name: "", priceGross: "", taxRate: "19", color: "#10B981", imageUrl: "", isCookItem: false, group: "" });
  const [foodFormError, setFoodFormError] = useState("");
  
  const [showSalesPointForm, setShowSalesPointForm] = useState(false);
  const [spFormName, setSpFormName] = useState("");
  const [spFormError, setSpFormError] = useState("");
  const [editingSalesPoint, setEditingSalesPoint] = useState<SalesPoint | null>(null);
  const [spEditName, setSpEditName] = useState("");
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventFormData, setEventFormData] = useState({ name: "", startDate: "", endDate: "" });
  const [eventFormError, setEventFormError] = useState("");
  
  const [showReductionForm, setShowReductionForm] = useState(false);
  const [editingReduction, setEditingReduction] = useState<PriceReduction | null>(null);
  const [reductionFormData, setReductionFormData] = useState({ itemId: 0, itemType: "drink" as "drink" | "food", startTime: "22:00", endTime: "02:00", reductionPercent: 20 });
  
  const [resetTarget, setResetTarget] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<any>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameTargetUser, setUsernameTargetUser] = useState<any>(null);
  const [newUsername, setNewUsername] = useState("");

  const isSuperAdmin = session?.role === "admin" && session?.username === "admin";

  const checkAuth = useCallback(async () => {
    try { const r = await fetch("/api/auth/me"); if (r.ok) setSession(await r.json()); else setSession(null); } catch { setSession(null); }
  }, []);

  const fetchDrinks = useCallback(async () => {
    try { const r = await fetch("/api/drinks"); if (r.ok) setDrinks(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchFoods = useCallback(async () => {
    try { const r = await fetch("/api/foods"); if (r.ok) setFoods(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchSalesPoints = useCallback(async () => {
    try { const r = await fetch("/api/sales-points"); if (r.ok) setSalesPoints(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchOrders = useCallback(async () => {
    try { const r = await fetch("/api/orders"); if (r.ok) setOrders(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchEvents = useCallback(async () => {
    try { const r = await fetch("/api/events"); if (r.ok) setEvents(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchTenants = useCallback(async () => {
    try { const r = await fetch("/api/users"); if (r.ok) setTenants(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchPriceReductions = useCallback(async () => {
    try { const r = await fetch("/api/price-reductions"); if (r.ok) setPriceReductions(await r.json()); } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (session) { fetchDrinks(); fetchFoods(); fetchSalesPoints(); fetchOrders(); fetchEvents(); fetchTenants(); fetchPriceReductions(); } }, [session, fetchDrinks, fetchFoods, fetchSalesPoints, fetchOrders, fetchEvents, fetchTenants, fetchPriceReductions]);

  async function api(path: string, method: string, body?: any) { 
    const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); 
    if (!r.ok) throw new Error((await r.json()).error || "API-Fehler"); 
    return r.json(); 
  }

  async function handleLogout() { await fetch("/api/auth/logout", { method: "POST" }); setSession(null); }

  // Drink handlers
  async function handleSaveDrink(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!formData.name || !formData.priceGross) { setFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: formData.name, priceGross: parseFloat(formData.priceGross), taxRate: parseFloat(formData.taxRate), hasDeposit: formData.hasDeposit, depositAmount: parseFloat(formData.depositAmount), cupSize: formData.cupSize, color: formData.color, imageUrl: formData.imageUrl || null, sortOrder: parseInt(formData.sortOrder) || 0, isPourDrink: formData.isPourDrink, salesPointIds: formData.salesPointIds || [], group: formData.group || null };
      if (editingDrink) await api(`/api/drinks/${editingDrink.id}`, "PUT", p); else await api("/api/drinks", "POST", p);
      setShowDrinkForm(false); setEditingDrink(null); fetchDrinks();
    } catch (err: any) { setFormError(err.message); }
  }

  async function handleDeleteDrink(id: number) { if (!confirm("Getränk deaktivieren?")) return; try { await api(`/api/drinks/${id}`, "DELETE"); fetchDrinks(); } catch (err) { console.error(err); } }

  // Food handlers
  async function handleSaveFood(e: React.FormEvent) {
    e.preventDefault(); setFoodFormError("");
    if (!foodFormData.name || !foodFormData.priceGross) { setFoodFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: foodFormData.name, priceGross: parseFloat(foodFormData.priceGross), taxRate: parseFloat(foodFormData.taxRate), color: foodFormData.color, imageUrl: foodFormData.imageUrl || null, isCookItem: foodFormData.isCookItem, group: foodFormData.group || null };
      if (editingFood) await api(`/api/foods/${editingFood.id}`, "PUT", p); else await api("/api/foods", "POST", p);
      setShowFoodForm(false); setEditingFood(null); fetchFoods();
    } catch (err: any) { setFoodFormError(err.message); }
  }

  async function handleDeleteFood(id: number) { if (!confirm("Speise deaktivieren?")) return; try { await api(`/api/foods/${id}`, "DELETE"); fetchFoods(); } catch (err) { console.error(err); } }

  // SalesPoint handlers
  async function handleSaveSP(e: React.FormEvent) { e.preventDefault(); setSpFormError(""); if (!spFormName.trim()) { setSpFormError("Name erforderlich"); return; } try { await api("/api/sales-points", "POST", { name: spFormName.trim() }); setShowSalesPointForm(false); setSpFormName(""); fetchSalesPoints(); } catch (err: any) { setSpFormError(err.message); } }
  async function handleUpdateSP(e: React.FormEvent) { e.preventDefault(); if (!editingSalesPoint || !spEditName.trim()) return; try { await api(`/api/sales-points/${editingSalesPoint.id}`, "PUT", { name: spEditName.trim() }); setEditingSalesPoint(null); setSpEditName(""); fetchSalesPoints(); } catch (err) { console.error(err); } }
  async function handleDeleteSP(id: number) { if (!confirm("Verkaufsstelle deaktivieren?")) return; try { await api(`/api/sales-points/${id}`, "DELETE"); fetchSalesPoints(); } catch (err) { console.error(err); } }

  // Event handlers
  async function handleSaveEvent(e: React.FormEvent) { e.preventDefault(); setEventFormError(""); if (!eventFormData.name || !eventFormData.startDate || !eventFormData.endDate) { setEventFormError("Alle Felder erforderlich"); return; } try { if (editingEvent) await api(`/api/events/${editingEvent.id}`, "PUT", eventFormData); else await api("/api/events", "POST", eventFormData); setShowEventForm(false); setEditingEvent(null); fetchEvents(); } catch (err: any) { setEventFormError(err.message); } }
  async function handleDeleteEvent(id: number) { if (!confirm("Event wirklich löschen?")) return; try { await api(`/api/events/${id}`, "DELETE"); fetchEvents(); } catch (err) { console.error(err); } }

  // Price reduction handlers
  async function handleSaveReduction(e: React.FormEvent) { e.preventDefault(); try { if (editingReduction) { await api(`/api/price-reductions/${editingReduction.id}`, "PUT", reductionFormData); } else { await api("/api/price-reductions", "POST", reductionFormData); } setShowReductionForm(false); setEditingReduction(null); fetchPriceReductions(); } catch (err: any) { alert(err.message || "Fehler"); } }
  async function handleDeleteReduction(id: number) { if (!confirm("Preisaktion löschen?")) return; try { await api(`/api/price-reductions/${id}`, "DELETE"); fetchPriceReductions(); } catch (err: any) { alert(err.message); } }
  async function handleToggleReduction(id: number, isActive: boolean) { try { await api(`/api/price-reductions/${id}`, "PUT", { isActive: !isActive }); fetchPriceReductions(); } catch (err: any) { alert(err.message); } }

  // Reset handlers
  async function handleResetOrders() { try { await api("/api/admin/reset", "POST", resetTarget ? { salesPointId: parseInt(resetTarget) } : {}); setShowResetConfirm(false); setResetTarget(""); fetchOrders(); } catch (err) { console.error(err); } }
  async function handleResetPour() { try { await api("/api/pour/reset", "POST"); fetchOrders(); } catch (err) { console.error(err); } }

  // Username handler
  async function handleChangeUsername() { if (!usernameTargetUser || !newUsername.trim()) return; try { await api(`/api/users/${usernameTargetUser.userId}/username`, "PUT", { username: newUsername.trim() }); setShowUsernameModal(false); setUsernameTargetUser(null); setNewUsername(""); fetchTenants(); alert("Username geändert"); } catch (err: any) { alert(err.message); } }

  function openEditDrink(d: Drink) { setEditingDrink(d); setFormData({ name: d.name, priceGross: d.priceGross.toString(), taxRate: d.taxRate.toString(), hasDeposit: d.hasDeposit, depositAmount: d.depositAmount.toString(), cupSize: d.cupSize, color: d.color, imageUrl: d.imageUrl || "", sortOrder: d.sortOrder.toString(), isPourDrink: d.isPourDrink, salesPointIds: d.salesPointIds || [], group: d.group || "" }); setFormError(""); setShowDrinkForm(true); }
  function openEditFood(f: Food) { setEditingFood(f); setFoodFormData({ name: f.name, priceGross: f.priceGross.toString(), taxRate: f.taxRate.toString(), color: f.color, imageUrl: f.imageUrl || "", isCookItem: f.isCookItem, group: f.group || "" }); setFoodFormError(""); setShowFoodForm(true); }

  if (session === undefined) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;
  if (!session) return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4"><div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700"><h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 Admin-Anmeldung</h1><p className="text-sm text-gray-400 text-center mb-4">Zugriff nur für Administratoren</p></div></div>;

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold">⚙️ Admin-Bereich</h1>
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Abmelden</button>
      </header>

      <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
        {[["drinks","🍺 Getränke"],["foods","🍔 Speisen"],["salesPoints","🏪 Verkaufsstellen"],["events","📅 Events"],["reductions","💰 Preisaktionen"],["orders","📊 Bestellungen"],...(isSuperAdmin ? [["users","👥 Nutzer"],["super","🔐 Super-Admin"]] : [])].map(([tab,label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-center font-bold text-sm whitespace-nowrap px-4 ${activeTab === tab ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>{label}</button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full overflow-y-auto">
        {/* DRINKS TAB */}
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Getränke</h2><button onClick={() => { setEditingDrink(null); setFormData({...EMPTY_DRINK}); setFormError(""); setShowDrinkForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Getränk</button></div>
            <div className="space-y-2">{drinks.map((d) => (<div key={d.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700"><div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor: d.color}}>{d.name.charAt(0)}</div><div className="flex-1 min-w-0"><div className="font-bold truncate">{d.name}</div><div className="text-xs text-gray-400">{d.priceGross.toFixed(2)} € · {d.taxRate}% MwSt.{d.hasReduction && <span className="ml-2 text-green-400 font-bold">-{d.reductionPercent}%</span>}</div></div><button onClick={() => openEditDrink(d)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button><button onClick={() => handleDeleteDrink(d.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button></div>))}</div>
          </div>
        )}

        {/* FOODS TAB */}
        {activeTab === "foods" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Speisen</h2><button onClick={() => { setEditingFood(null); setFoodFormData({ name: "", priceGross: "", taxRate: "19", color: "#10B981", imageUrl: "", isCookItem: false, group: "" }); setFoodFormError(""); setShowFoodForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Speise</button></div>
            <div className="space-y-2">{foods.map((f) => (<div key={f.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700"><div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor: f.color}}>{f.name.charAt(0)}</div><div className="flex-1 min-w-0"><div className="font-bold truncate">{f.name}</div><div className="text-xs text-gray-400">{f.priceGross.toFixed(2)} € · {f.taxRate}% MwSt.{f.hasReduction && <span className="ml-2 text-green-400 font-bold">-{f.reductionPercent}%</span>}</div></div><button onClick={() => openEditFood(f)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button><button onClick={() => handleDeleteFood(f.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button></div>))}</div>
          </div>
        )}

        {/* SALES POINTS TAB */}
        {activeTab === "salesPoints" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Verkaufsstellen</h2><button onClick={() => { setSpFormName(""); setSpFormError(""); setShowSalesPointForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Verkaufsstelle</button></div>
            <div className="space-y-2">{salesPoints.map((sp) => (<div key={sp.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700"><div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-blue-600">{sp.name.charAt(0)}</div><div className="flex-1 min-w-0"><div className="font-bold truncate">{sp.name}</div><div className="text-xs text-gray-400">Sortierung: {sp.sortOrder}</div></div><button onClick={() => { setEditingSalesPoint(sp); setSpEditName(sp.name); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button><button onClick={() => handleDeleteSP(sp.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button></div>))}</div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Events</h2><button onClick={() => { setEditingEvent(null); setEventFormData({ name: "", startDate: "", endDate: "" }); setEventFormError(""); setShowEventForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Event</button></div>
            <div className="space-y-2">{events.map((ev) => (<div key={ev.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="flex items-center justify-between mb-2"><div className="font-bold">{ev.name}</div><div className="flex gap-2"><button onClick={() => { setEditingEvent(ev); setEventFormData({ name: ev.name, startDate: ev.startDate, endDate: ev.endDate }); setShowEventForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs">✏️</button><button onClick={() => handleDeleteEvent(ev.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs">🗑️</button></div></div><div className="text-sm text-gray-400">{new Date(ev.startDate).toLocaleDateString("de-DE")} - {new Date(ev.endDate).toLocaleDateString("de-DE")}</div></div>))}</div>
          </div>
        )}

        {/* PRICE REDUCTIONS TAB */}
        {activeTab === "reductions" && (
          <div>
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">💰 Preisaktionen</h2><button onClick={() => { setEditingReduction(null); setReductionFormData({ itemId: 0, itemType: "drink", startTime: "22:00", endTime: "02:00", reductionPercent: 20 }); setShowReductionForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Aktion</button></div>
            <div className="space-y-2">{priceReductions.map((red) => { const item = red.itemType === "drink" ? drinks.find(d => d.id === red.itemId) : foods.find(f => f.id === red.itemId); return (<div key={red.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="flex items-center justify-between"><div><div className="font-bold">{item ? item.name : "Unbekannt"} ({red.itemType === "drink" ? "🍺" : "🍔"})</div><div className="text-sm text-gray-400">{red.startTime} - {red.endTime} · {red.reductionPercent}%</div></div><div className="flex gap-2"><button onClick={() => handleToggleReduction(red.id, red.isActive)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${red.isActive ? "bg-green-700" : "bg-gray-600"}`}>{red.isActive ? "✅" : "⏸️"}</button><button onClick={() => handleDeleteReduction(red.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 text-xs">🗑️</button></div></div>); })}</div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Bestellungen</h2>
            <div className="flex gap-2 mb-4"><button onClick={() => setShowResetConfirm(true)} className="px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold">🔄 Zurücksetzen</button></div>
            <div className="space-y-2">{orders.map((o) => (<div key={o.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700"><div className="font-bold">#{o.id} - {o.totalGross.toFixed(2)} €</div><div className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString("de-DE")}{o.cashierName && ` · ${o.cashierName}`}</div></div>))}</div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && isSuperAdmin && (
          <div>
            <h2 className="text-lg font-bold mb-4">Nutzer</h2>
            <div className="space-y-2">{tenants.map((t) => (<div key={t.userId} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="flex items-center justify-between mb-2"><div className="font-bold">{t.username}</div><div className="flex gap-2"><button onClick={() => { setUsernameTargetUser(t); setNewUsername(t.username); setShowUsernameModal(true); }} className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs">✏️ Username</button></div></div><div className="text-sm text-gray-400">{t.isActive ? "✅ Aktiv" : "⏸️ Inaktiv"} · bis {new Date(t.expiresAt).toLocaleDateString("de-DE")}</div></div>))}</div>
          </div>
        )}

        {/* SUPER ADMIN TAB */}
        {activeTab === "super" && isSuperAdmin && (
          <div>
            <h2 className="text-lg font-bold mb-4">🔐 Super-Admin</h2>
            <p className="text-sm text-gray-400 mb-4">Mandanten-Verwaltung</p>
            <div className="space-y-2">{tenants.map((t) => (<div key={t.userId} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="font-bold mb-2">{t.username}</div><div className="text-sm text-gray-400 mb-2">{t.drinks} Getränke · {t.orders} Bestellungen</div><button onClick={async () => { try { await api("/api/superadmin", "POST", { tenantId: t.userId }); window.location.reload(); } catch (err) { alert("Fehler"); } }} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs">🔄 Wechseln</button></div>))}</div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showDrinkForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleSaveDrink} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">{editingDrink ? "Getränk bearbeiten" : "Neues Getränk"}</h2>{formError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4">{formError}</div>}<div className="space-y-4"><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /><input type="number" step="0.01" value={formData.priceGross} onChange={(e) => setFormData({...formData, priceGross: e.target.value})} placeholder="Bruttopreis" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowDrinkForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></form></div>)}

      {showFoodForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleSaveFood} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">{editingFood ? "Speise bearbeiten" : "Neue Speise"}</h2>{foodFormError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4">{foodFormError}</div>}<div className="space-y-4"><input type="text" value={foodFormData.name} onChange={(e) => setFoodFormData({...foodFormData, name: e.target.value})} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /><input type="number" step="0.01" value={foodFormData.priceGross} onChange={(e) => setFoodFormData({...foodFormData, priceGross: e.target.value})} placeholder="Bruttopreis" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowFoodForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></form></div>)}

      {showSalesPointForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleSaveSP} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">Neue Verkaufsstelle</h2><input type="text" value={spFormName} onChange={(e) => setSpFormName(e.target.value)} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 mb-4" /><div className="flex gap-3"><button type="button" onClick={() => setShowSalesPointForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></form></div>)}

      {editingSalesPoint && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleUpdateSP} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">Verkaufsstelle bearbeiten</h2><input type="text" value={spEditName} onChange={(e) => setSpEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 mb-4" /><div className="flex gap-3"><button type="button" onClick={() => setEditingSalesPoint(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></form></div>)}

      {showEventForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleSaveEvent} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">{editingEvent ? "Event bearbeiten" : "Neues Event"}</h2><div className="space-y-4"><input type="text" value={eventFormData.name} onChange={(e) => setEventFormData({...eventFormData, name: e.target.value})} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /><input type="date" value={eventFormData.startDate} onChange={(e) => setEventFormData({...eventFormData, startDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /><input type="date" value={eventFormData.endDate} onChange={(e) => setEventFormData({...eventFormData, endDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowEventForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></form></div>)}

      {showReductionForm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleSaveReduction} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">{editingReduction ? "Bearbeiten" : "Neue Preisaktion"}</h2><div className="space-y-4"><select value={reductionFormData.itemType} onChange={(e) => setReductionFormData({...reductionFormData, itemType: e.target.value as "drink" | "food"})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600"><option value="drink">🍺 Getränk</option><option value="food">🍔 Speise</option></select><select value={reductionFormData.itemId} onChange={(e) => setReductionFormData({...reductionFormData, itemId: parseInt(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600"><option value={0}>Wählen...</option>{(reductionFormData.itemType === "drink" ? drinks : foods).map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}</select><input type="time" value={reductionFormData.startTime} onChange={(e) => setReductionFormData({...reductionFormData, startTime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /><input type="time" value={reductionFormData.endTime} onChange={(e) => setReductionFormData({...reductionFormData, endTime: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /><input type="number" min="0" max="100" value={reductionFormData.reductionPercent} onChange={(e) => setReductionFormData({...reductionFormData, reductionPercent: parseFloat(e.target.value)})} placeholder="Rabatt %" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" /></div><div className="flex gap-3 mt-6"><button type="button" onClick={() => { setShowReductionForm(false); setEditingReduction(null); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></form></div>)}

      {showResetConfirm && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">Zähler zurücksetzen?</h2><div className="flex gap-3"><button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button onClick={handleResetOrders} className="flex-1 py-3 rounded-xl font-bold bg-red-600">Zurücksetzen</button></div></div></div>)}

      {showUsernameModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700"><h2 className="text-xl font-bold mb-4">Username ändern</h2><input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 mb-4" /><div className="flex gap-3"><button onClick={() => setShowUsernameModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button><button onClick={handleChangeUsername} className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button></div></div></div>)}
    </div>
  );
}
