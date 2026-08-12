"use client";

import { useState, useEffect } from "react";

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("drinks");
  
  // Data states
  const [drinks, setDrinks] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [salesPoints, setSalesPoints] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [priceReductions, setPriceReductions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [cupStats, setCupStats] = useState<any>(null);
  
  // Form states
  const [showDrinkForm, setShowDrinkForm] = useState(false);
  const [editingDrink, setEditingDrink] = useState<any>(null);
  const [drinkForm, setDrinkForm] = useState({ name: "", priceGross: "", taxRate: "19", hasDeposit: true, depositAmount: "2", cupSize: "04", color: "#3B82F6", isPourDrink: false, group: "", salesPointIds: [] as number[] });
  
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFood, setEditingFood] = useState<any>(null);
  const [foodForm, setFoodForm] = useState({ name: "", priceGross: "", taxRate: "19", color: "#10B981", isCookItem: false, group: "", salesPointIds: [] as number[] });
  
  const [showSPForm, setShowSPForm] = useState(false);
  const [editingSP, setEditingSP] = useState<any>(null);
  const [spForm, setSpForm] = useState({ name: "", sortOrder: "" });
  
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventForm, setEventForm] = useState({ name: "", startDate: "", endDate: "" });
  
  const [showReductionForm, setShowReductionForm] = useState(false);
  const [editingReduction, setEditingReduction] = useState<any>(null);
  const [reductionForm, setReductionForm] = useState({ itemId: 0, itemType: "drink", startTime: "22:00", endTime: "02:00", reductionPercent: 20 });
  
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [tenantForm, setTenantForm] = useState({ username: "", password: "", expiresAt: "", isActive: true });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (session) {
      fetchAll();
    }
  }, [session]);

  const fetchAll = async () => {
    try {
      const [drinksRes, foodsRes, spRes, eventsRes, reductionsRes, ordersRes, tenantsRes, cupStatsRes] = await Promise.all([
        fetch("/api/drinks"),
        fetch("/api/foods"),
        fetch("/api/sales-points"),
        fetch("/api/events"),
        fetch("/api/price-reductions"),
        fetch("/api/orders"),
        fetch("/api/users"),
        fetch("/api/cups/stats"),
      ]);
      if (drinksRes.ok) setDrinks(await drinksRes.json());
      if (foodsRes.ok) setFoods(await foodsRes.json());
      if (spRes.ok) setSalesPoints(await spRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (reductionsRes.ok) setPriceReductions(await reductionsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (tenantsRes.ok) setTenants(await tenantsRes.json());
      if (cupStatsRes.ok) setCupStats(await cupStatsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  // Drink handlers
  const handleSaveDrink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDrink) {
        await fetch(`/api/drinks/${editingDrink.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(drinkForm) });
      } else {
        await fetch("/api/drinks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(drinkForm) });
      }
      setShowDrinkForm(false);
      setEditingDrink(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDrink = async (id: number) => {
    if (!confirm("Getränk löschen?")) return;
    await fetch(`/api/drinks/${id}`, { method: "DELETE" });
    fetchAll();
  };

  // Food handlers
  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFood) {
        await fetch(`/api/foods/${editingFood.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(foodForm) });
      } else {
        await fetch("/api/foods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(foodForm) });
      }
      setShowFoodForm(false);
      setEditingFood(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFood = async (id: number) => {
    if (!confirm("Speise löschen?")) return;
    await fetch(`/api/foods/${id}`, { method: "DELETE" });
    fetchAll();
  };

  // SalesPoint handlers
  const handleSaveSP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSP) {
        await fetch(`/api/sales-points/${editingSP.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spForm) });
      } else {
        await fetch("/api/sales-points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(spForm) });
      }
      setShowSPForm(false);
      setEditingSP(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSP = async (id: number) => {
    if (!confirm("Verkaufsstelle löschen?")) return;
    await fetch(`/api/sales-points/${id}`, { method: "DELETE" });
    fetchAll();
  };

  // Event handlers
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await fetch(`/api/events/${editingEvent.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
      } else {
        await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
      }
      setShowEventForm(false);
      setEditingEvent(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Event löschen?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    fetchAll();
  };

  // Price reduction handlers
  const handleSaveReduction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingReduction) {
        await fetch(`/api/price-reductions/${editingReduction.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reductionForm) });
      } else {
        await fetch("/api/price-reductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reductionForm) });
      }
      setShowReductionForm(false);
      setEditingReduction(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReduction = async (id: number) => {
    if (!confirm("Preisaktion löschen?")) return;
    await fetch(`/api/price-reductions/${id}`, { method: "DELETE" });
    fetchAll();
  };

  // Tenant handlers
  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await fetch(`/api/users/${editingTenant.userId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tenantForm) });
      } else {
        await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tenantForm) });
      }
      setShowTenantForm(false);
      setEditingTenant(null);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTenant = async (userId: number) => {
    if (!confirm("Nutzer löschen?")) return;
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    fetchAll();
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 Admin-Anmeldung</h1>
          <p className="text-sm text-gray-400 text-center">Zugriff nur für Administratoren</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold">⚙️ Admin-Bereich</h1>
        <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Abmelden</button>
      </header>

      <div className="flex border-b border-gray-700 shrink-0 overflow-x-auto">
        {["drinks", "foods", "salesPoints", "events", "reductions", "cups", "orders"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-center font-bold text-sm whitespace-nowrap px-4 ${activeTab === tab ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>
            {tab === "drinks" && "🍺 Getränke"}
            {tab === "foods" && "🍔 Speisen"}
            {tab === "salesPoints" && "🏪 Verkaufsstellen"}
            {tab === "events" && "📅 Events"}
            {tab === "reductions" && "💰 Preisaktionen"}
            {tab === "cups" && "🥤 Becher"}
            {tab === "orders" && "📊 Bestellungen"}
          </button>
        ))}
        {session.role === "admin" && (
          <button onClick={() => setActiveTab("users")} className={`flex-1 py-3 text-center font-bold text-sm whitespace-nowrap px-4 ${activeTab === "users" ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>
            👥 Nutzer
          </button>
        )}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Getränke</h2>
              <button onClick={() => { setEditingDrink(null); setDrinkForm({ name: "", priceGross: "", taxRate: "19", hasDeposit: true, depositAmount: "2", cupSize: "04", color: "#3B82F6", isPourDrink: false, group: "", salesPointIds: [] }); setShowDrinkForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Getränk</button>
            </div>
            <div className="space-y-2">
              {drinks.map((d) => (
                <div key={d.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: d.color }}>{d.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.priceGross?.toFixed(2)} € · {d.taxRate}% MwSt. · Gruppe: {d.group || "Keine"}</div>
                  </div>
                  <button onClick={() => { setEditingDrink(d); setDrinkForm({ name: d.name, priceGross: d.priceGross.toString(), taxRate: d.taxRate.toString(), hasDeposit: d.hasDeposit, depositAmount: d.depositAmount.toString(), cupSize: d.cupSize, color: d.color, isPourDrink: d.isPourDrink, group: d.group || "", salesPointIds: d.salesPointIds || [] }); setShowDrinkForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteDrink(d.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "foods" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Speisen</h2>
              <button onClick={() => { setEditingFood(null); setFoodForm({ name: "", priceGross: "", taxRate: "19", color: "#10B981", isCookItem: false, group: "", salesPointIds: [] }); setShowFoodForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Speise</button>
            </div>
            <div className="space-y-2">
              {foods.map((f) => (
                <div key={f.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: f.color }}>{f.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{f.name}</div>
                    <div className="text-xs text-gray-400">{f.priceGross?.toFixed(2)} € · {f.taxRate}% MwSt. · Gruppe: {f.group || "Keine"}</div>
                  </div>
                  <button onClick={() => { setEditingFood(f); setFoodForm({ name: f.name, priceGross: f.priceGross.toString(), taxRate: f.taxRate.toString(), color: f.color, isCookItem: f.isCookItem, group: f.group || "", salesPointIds: f.salesPointIds || [] }); setShowFoodForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteFood(f.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "salesPoints" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Verkaufsstellen</h2>
              <button onClick={() => { setEditingSP(null); setSpForm({ name: "", sortOrder: "" }); setShowSPForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Verkaufsstelle</button>
            </div>
            <div className="space-y-2">
              {salesPoints.map((sp) => (
                <div key={sp.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-blue-600">{sp.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{sp.name}</div>
                    <div className="text-xs text-gray-400">Sortierung: {sp.sortOrder}</div>
                  </div>
                  <button onClick={() => { setEditingSP(sp); setSpForm({ name: sp.name, sortOrder: sp.sortOrder.toString() }); setShowSPForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteSP(sp.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Events</h2>
              <button onClick={() => { setEditingEvent(null); setEventForm({ name: "", startDate: "", endDate: "" }); setShowEventForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Event</button>
            </div>
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold">{ev.name}</div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingEvent(ev); setEventForm({ name: ev.name, startDate: ev.startDate, endDate: ev.endDate }); setShowEventForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs">✏️</button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs">🗑️</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">{new Date(ev.startDate).toLocaleDateString("de-DE")} - {new Date(ev.endDate).toLocaleDateString("de-DE")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "reductions" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">💰 Preisaktionen</h2>
              <button onClick={() => { setEditingReduction(null); setReductionForm({ itemId: 0, itemType: "drink", startTime: "22:00", endTime: "02:00", reductionPercent: 20 }); setShowReductionForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Aktion</button>
            </div>
            <div className="space-y-2">
              {priceReductions.map((red) => {
                const item = red.itemType === "drink" ? drinks.find((d) => d.id === red.itemId) : foods.find((f) => f.id === red.itemId);
                return (
                  <div key={red.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{item ? item.name : "Unbekannt"} ({red.itemType === "drink" ? "🍺" : "🍔"})</div>
                        <div className="text-sm text-gray-400">{red.startTime} - {red.endTime} · {red.reductionPercent}%</div>
                      </div>
                      <button onClick={() => handleDeleteReduction(red.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "cups" && (
          <div>
            <h2 className="text-lg font-bold mb-4">🥤 Becher-Statistik</h2>
            {cupStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <h3 className="font-bold mb-2">0,2L Becher</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Ausgegeben:</span><span className="font-bold">{cupStats.given02}</span></div>
                    <div className="flex justify-between"><span>Zurückgenommen:</span><span className="font-bold">{cupStats.returned02}</span></div>
                    <div className="flex justify-between border-t border-gray-700 pt-2"><span>Im Umlauf:</span><span className="font-bold text-amber-400">{cupStats.given02 - cupStats.returned02}</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <h3 className="font-bold mb-2">0,4L Becher</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Ausgegeben:</span><span className="font-bold">{cupStats.given04}</span></div>
                    <div className="flex justify-between"><span>Zurückgenommen:</span><span className="font-bold">{cupStats.returned04}</span></div>
                    <div className="flex justify-between border-t border-gray-700 pt-2"><span>Im Umlauf:</span><span className="font-bold text-amber-400">{cupStats.given04 - cupStats.returned04}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <h2 className="text-lg font-bold mb-4">📊 Bestellungen</h2>
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">#{o.id}</div>
                      <div className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString("de-DE")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">{o.totalGross.toFixed(2)} €</div>
                      {o.cashierName && <div className="text-xs text-gray-400">{o.cashierName}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && session.role === "admin" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">👥 Nutzer</h2>
              <button onClick={() => { setEditingTenant(null); setTenantForm({ username: "", password: "", expiresAt: "", isActive: true }); setShowTenantForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neuer Nutzer</button>
            </div>
            <div className="space-y-2">
              {tenants.map((t) => (
                <div key={t.userId} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold">{t.username}</div>
                      <div className="text-xs text-gray-400">{t.isActive ? "✅ Aktiv" : "⏸️ Inaktiv"} · bis {new Date(t.expiresAt).toLocaleDateString("de-DE")}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingTenant(t); setTenantForm({ username: t.username, password: "", expiresAt: t.expiresAt, isActive: t.isActive }); setShowTenantForm(true); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs">✏️</button>
                      <button onClick={() => handleDeleteTenant(t.userId)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drink Form Modal */}
      {showDrinkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveDrink} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingDrink ? "Getränk bearbeiten" : "Neues Getränk"}</h2>
            <div className="space-y-4">
              <input type="text" value={drinkForm.name} onChange={(e) => setDrinkForm({ ...drinkForm, name: e.target.value })} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="number" step="0.01" value={drinkForm.priceGross} onChange={(e) => setDrinkForm({ ...drinkForm, priceGross: e.target.value })} placeholder="Bruttopreis" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="number" value={drinkForm.taxRate} onChange={(e) => setDrinkForm({ ...drinkForm, taxRate: e.target.value })} placeholder="MwSt. %" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="text" value={drinkForm.cupSize} onChange={(e) => setDrinkForm({ ...drinkForm, cupSize: e.target.value })} placeholder="Bechergröße (02/04)" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="text" value={drinkForm.group} onChange={(e) => setDrinkForm({ ...drinkForm, group: e.target.value })} placeholder="Gruppe" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <div>
                <label className="block text-sm text-gray-400 mb-2">Verfügbar an Verkaufsstellen:</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {salesPoints.map((sp) => (
                    <label key={sp.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={drinkForm.salesPointIds.includes(sp.id)} onChange={(e) => {
                        if (e.target.checked) {
                          setDrinkForm({ ...drinkForm, salesPointIds: [...drinkForm.salesPointIds, sp.id] });
                        } else {
                          setDrinkForm({ ...drinkForm, salesPointIds: drinkForm.salesPointIds.filter((id) => id !== sp.id) });
                        }
                      }} className="w-4 h-4" />
                      <span>{sp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={drinkForm.hasDeposit} onChange={(e) => setDrinkForm({ ...drinkForm, hasDeposit: e.target.checked })} className="w-4 h-4" />
                <span>Pfand</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={drinkForm.isPourDrink} onChange={(e) => setDrinkForm({ ...drinkForm, isPourDrink: e.target.checked })} className="w-4 h-4" />
                <span>Zapfgetränk</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowDrinkForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Food Form Modal */}
      {showFoodForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveFood} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingFood ? "Speise bearbeiten" : "Neue Speise"}</h2>
            <div className="space-y-4">
              <input type="text" value={foodForm.name} onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="number" step="0.01" value={foodForm.priceGross} onChange={(e) => setFoodForm({ ...foodForm, priceGross: e.target.value })} placeholder="Bruttopreis" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="number" value={foodForm.taxRate} onChange={(e) => setFoodForm({ ...foodForm, taxRate: e.target.value })} placeholder="MwSt. %" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="text" value={foodForm.group} onChange={(e) => setFoodForm({ ...foodForm, group: e.target.value })} placeholder="Gruppe" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <div>
                <label className="block text-sm text-gray-400 mb-2">Verfügbar an Verkaufsstellen:</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {salesPoints.map((sp) => (
                    <label key={sp.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={foodForm.salesPointIds.includes(sp.id)} onChange={(e) => {
                        if (e.target.checked) {
                          setFoodForm({ ...foodForm, salesPointIds: [...foodForm.salesPointIds, sp.id] });
                        } else {
                          setFoodForm({ ...foodForm, salesPointIds: foodForm.salesPointIds.filter((id) => id !== sp.id) });
                        }
                      }} className="w-4 h-4" />
                      <span>{sp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={foodForm.isCookItem} onChange={(e) => setFoodForm({ ...foodForm, isCookItem: e.target.checked })} className="w-4 h-4" />
                <span>Kochartikel</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowFoodForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* SalesPoint Form Modal */}
      {showSPForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveSP} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingSP ? "Bearbeiten" : "Neue Verkaufsstelle"}</h2>
            <input type="text" value={spForm.name} onChange={(e) => setSpForm({ ...spForm, name: e.target.value })} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 mb-4" />
            <input type="number" value={spForm.sortOrder} onChange={(e) => setSpForm({ ...spForm, sortOrder: e.target.value })} placeholder="Sortierung" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 mb-4" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSPForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveEvent} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingEvent ? "Bearbeiten" : "Neues Event"}</h2>
            <div className="space-y-4">
              <input type="text" value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="Name" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="date" value={eventForm.startDate} onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="date" value={eventForm.endDate} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowEventForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Reduction Form Modal */}
      {showReductionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveReduction} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingReduction ? "Bearbeiten" : "Neue Preisaktion"}</h2>
            <div className="space-y-4">
              <select value={reductionForm.itemType} onChange={(e) => setReductionForm({ ...reductionForm, itemType: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600">
                <option value="drink">🍺 Getränk</option>
                <option value="food">🍔 Speise</option>
              </select>
              <select value={reductionForm.itemId} onChange={(e) => setReductionForm({ ...reductionForm, itemId: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600">
                <option value={0}>Wählen...</option>
                {(reductionForm.itemType === "drink" ? drinks : foods).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Startzeit (DE)</label>
                <input type="time" value={reductionForm.startTime} onChange={(e) => setReductionForm({ ...reductionForm, startTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Endzeit (DE)</label>
                <input type="time" value={reductionForm.endTime} onChange={(e) => setReductionForm({ ...reductionForm, endTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              </div>
              <input type="number" min="0" max="100" value={reductionForm.reductionPercent} onChange={(e) => setReductionForm({ ...reductionForm, reductionPercent: parseFloat(e.target.value) })} placeholder="Rabatt %" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowReductionForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Tenant Form Modal */}
      {showTenantForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveTenant} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingTenant ? "Nutzer bearbeiten" : "Neuer Nutzer"}</h2>
            <div className="space-y-4">
              <input type="text" value={tenantForm.username} onChange={(e) => setTenantForm({ ...tenantForm, username: e.target.value })} placeholder="Benutzername" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="password" value={tenantForm.password} onChange={(e) => setTenantForm({ ...tenantForm, password: e.target.value })} placeholder={editingTenant ? "Passwort leer = nicht ändern" : "Passwort"} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <input type="datetime-local" value={tenantForm.expiresAt} onChange={(e) => setTenantForm({ ...tenantForm, expiresAt: e.target.value })} placeholder="Ablaufdatum" className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={tenantForm.isActive} onChange={(e) => setTenantForm({ ...tenantForm, isActive: e.target.checked })} className="w-4 h-4" />
                <span>Aktiv</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowTenantForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600">Speichern</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
