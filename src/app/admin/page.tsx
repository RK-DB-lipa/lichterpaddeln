"use client";

import { useState, useEffect, useCallback } from "react";

type Drink = {
  id: number;
  name: string;
  priceNet: number;
  taxRate: number;
  hasDeposit: boolean;
  depositAmount: number;
  color: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  priceGross: number;
  isPourDrink: boolean;
};

type SalesPoint = {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type OrderItem = {
  drinkId: number;
  drinkName: string;
  totalQuantity: number;
  totalGross: number;
  totalDeposit: number;
};

type OrderTotals = {
  totalOrders: number;
  totalRevenue: number;
  totalDepositsCharged: number;
  totalDepositsReturned: number;
  netDeposits: number;
};

type Order = {
  id: number;
  salesPointId: number;
  totalGross: number;
  totalDeposit: number;
  totalDepositReturned: number;
  netDeposit: number;
  createdAt: string;
};

type PourStat = {
  drinkName: string;
  totalPoured: number;
};

const EMPTY_DRINK = {
  name: "",
  priceNet: "",
  taxRate: "19",
  hasDeposit: true,
  depositAmount: "2.00",
  color: "#3B82F6",
  imageUrl: "",
  sortOrder: "0",
  isPourDrink: false,
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [showDrinkForm, setShowDrinkForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_DRINK);
  const [formError, setFormError] = useState("");

  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [showSalesPointForm, setShowSalesPointForm] = useState(false);
  const [spFormName, setSpFormName] = useState("");
  const [spFormError, setSpFormError] = useState("");
  const [editingSalesPoint, setEditingSalesPoint] = useState<SalesPoint | null>(null);
  const [spEditName, setSpEditName] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [drinkSummary, setDrinkSummary] = useState<OrderItem[]>([]);
  const [totals, setTotals] = useState<OrderTotals | null>(null);
  const [activeTab, setActiveTab] = useState<"drinks" | "salesPoints" | "orders">("drinks");
  const [orderFilter, setOrderFilter] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetTarget, setResetTarget] = useState<string>("");

  const [pourStats, setPourStats] = useState<PourStat[]>([]);
  const [showPourResetConfirm, setShowPourResetConfirm] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(data.authenticated);
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    }
  }, []);

  const fetchDrinks = useCallback(async () => {
    try {
      const res = await fetch("/api/drinks");
      if (res.ok) setDrinks(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchSalesPoints = useCallback(async () => {
    try {
      const res = await fetch("/api/sales-points");
      if (res.ok) setSalesPoints(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const url = orderFilter ? `/api/orders?salesPointId=${orderFilter}` : "/api/orders";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setDrinkSummary(data.drinkSummary || []);
        setTotals(data.totals || null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [orderFilter]);

  const fetchPourStats = useCallback(async () => {
    try {
      const res = await fetch("/api/pour/stats");
      if (res.ok) setPourStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      fetchDrinks();
      fetchSalesPoints();
      fetchOrders();
      fetchPourStats();
    }
  }, [authenticated, fetchDrinks, fetchSalesPoints, fetchOrders, fetchPourStats]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setAuthenticated(true);
      } else {
        const data = await res.json();
        setLoginError(data.error || "Anmeldung fehlgeschlagen");
      }
    } catch {
      setLoginError("Verbindungsfehler");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
  }

  function openNewDrinkForm() {
    setEditingDrink(null);
    setFormData(EMPTY_DRINK);
    setFormError("");
    setShowDrinkForm(true);
  }

  function openEditDrinkForm(drink: Drink) {
    setEditingDrink(drink);
    setFormData({
      name: drink.name,
      priceNet: drink.priceNet.toString(),
      taxRate: drink.taxRate.toString(),
      hasDeposit: drink.hasDeposit,
      depositAmount: drink.depositAmount.toString(),
      color: drink.color,
      imageUrl: drink.imageUrl || "",
      sortOrder: drink.sortOrder.toString(),
      isPourDrink: drink.isPourDrink,
    });
    setFormError("");
    setShowDrinkForm(true);
  }

  async function handleSaveDrink(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!formData.name || !formData.priceNet) {
      setFormError("Name und Nettopreis sind erforderlich");
      return;
    }
    const body = {
      name: formData.name,
      priceNet: parseFloat(formData.priceNet),
      taxRate: parseFloat(formData.taxRate),
      hasDeposit: formData.hasDeposit,
      depositAmount: parseFloat(formData.depositAmount),
      color: formData.color,
      imageUrl: formData.imageUrl || null,
      sortOrder: parseInt(formData.sortOrder) || 0,
      isPourDrink: formData.isPourDrink,
    };
    try {
      const url = editingDrink ? `/api/drinks/${editingDrink.id}` : "/api/drinks";
      const method = editingDrink ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowDrinkForm(false);
        fetchDrinks();
      } else {
        const data = await res.json();
        setFormError(data.error || "Fehler beim Speichern");
      }
    } catch {
      setFormError("Verbindungsfehler");
    }
  }

  async function handleDeleteDrink(id: number) {
    if (!confirm("Getränk deaktivieren?")) return;
    try {
      await fetch(`/api/drinks/${id}`, { method: "DELETE" });
      fetchDrinks();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveSalesPoint(e: React.FormEvent) {
    e.preventDefault();
    setSpFormError("");
    if (!spFormName.trim()) {
      setSpFormError("Name ist erforderlich");
      return;
    }
    try {
      const res = await fetch("/api/sales-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: spFormName.trim() }),
      });
      if (res.ok) {
        setShowSalesPointForm(false);
        setSpFormName("");
        fetchSalesPoints();
      } else {
        const data = await res.json();
        setSpFormError(data.error || "Fehler beim Speichern");
      }
    } catch {
      setSpFormError("Verbindungsfehler");
    }
  }

  async function handleUpdateSalesPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSalesPoint || !spEditName.trim()) return;
    try {
      const res = await fetch(`/api/sales-points/${editingSalesPoint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: spEditName.trim() }),
      });
      if (res.ok) {
        setEditingSalesPoint(null);
        setSpEditName("");
        fetchSalesPoints();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteSalesPoint(id: number) {
    if (!confirm("Verkaufsstelle deaktivieren?")) return;
    try {
      await fetch(`/api/sales-points/${id}`, { method: "DELETE" });
      fetchSalesPoints();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleResetCounters() {
    try {
      const body = resetTarget ? { salesPointId: parseInt(resetTarget) } : {};
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowResetConfirm(false);
        setResetTarget("");
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleResetPourStats() {
    try {
      const res = await fetch("/api/pour/reset", { method: "POST" });
      if (res.ok) {
        setShowPourResetConfirm(false);
        fetchPourStats();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const getSalesPointName = (id: number) => {
    return salesPoints.find((sp) => sp.id === id)?.name || `ID ${id}`;
  };

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Laden...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 Admin-Anmeldung</h1>
          {loginError && (
            <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{loginError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Benutzername</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Passwort</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all">Anmelden</button>
            <a href="/" className="block text-center text-sm text-gray-400 hover:text-white">← Zurück zur Kasse</a>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold">⚙️ Admin-Bereich</h1>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-blue-400 hover:underline">← Kasse</a>
          <a href="/zapf" className="text-sm text-green-400 hover:underline">Zapfen →</a>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Abmelden</button>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-700 shrink-0">
        <button onClick={() => setActiveTab("drinks")} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === "drinks" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"}`}>🍺 Getränke</button>
        <button onClick={() => setActiveTab("salesPoints")} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === "salesPoints" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"}`}>🏪 Verkaufsstellen</button>
        <button onClick={() => setActiveTab("orders")} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === "orders" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"}`}>📊 Bestellungen</button>
      </div>

      {/* Content */}
      <div className={`flex-1 p-4 max-w-4xl mx-auto w-full ${activeTab !== "salesPoints" ? "overflow-y-auto" : ""}`}>
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Getränke</h2>
              <button onClick={openNewDrinkForm} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Getränk</button>
            </div>
            <div className="space-y-2">
              {drinks.map((drink) => (
                <div key={drink.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: drink.color }}>
                    {drink.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate flex items-center gap-2">
                      {drink.name}
                      {drink.isPourDrink && <span className="text-[10px] bg-orange-600 px-1.5 py-0.5 rounded text-white">ZAPF</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      Brutto: {drink.priceGross.toFixed(2)} € · {drink.taxRate}% MwSt.
                      {drink.hasDeposit ? ` · Pfand: ${drink.depositAmount.toFixed(2)} €` : " · Kein Pfand"}
                    </div>
                  </div>
                  <button onClick={() => openEditDrinkForm(drink)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteDrink(drink.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
              {drinks.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Getränke angelegt.</p>}
            </div>
          </div>
        )}

        {activeTab === "salesPoints" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Verkaufsstellen</h2>
              <button onClick={() => { setSpFormName(""); setSpFormError(""); setShowSalesPointForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Verkaufsstelle</button>
            </div>
            <div className="space-y-2">
              {salesPoints.map((sp) => (
                <div key={sp.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs bg-blue-600">{sp.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{sp.name}</div>
                    <div className="text-xs text-gray-400">Sortierung: {sp.sortOrder}</div>
                  </div>
                  <button onClick={() => { setEditingSalesPoint(sp); setSpEditName(sp.name); }} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteSalesPoint(sp.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
              {salesPoints.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Verkaufsstellen angelegt.</p>}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div>
            <h2 className="text-lg font-bold mb-4">Bestellübersicht</h2>

            {/* Pour stats */}
            {pourStats.length > 0 && (
              <div className="mb-6 bg-gray-800 rounded-xl border border-gray-700 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-bold">🍺 Zapf-Statistik (Event-Gesamt)</h3>
                  <button
                    onClick={() => setShowPourResetConfirm(true)}
                    className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-xs font-bold border border-red-500/30"
                  >
                    🔄 Zapf-Zähler nullen
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {pourStats.map((stat) => (
                    <div key={stat.drinkName} className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400">{stat.drinkName}</div>
                      <div className="text-2xl font-bold text-green-400">{stat.totalPoured}</div>
                      <div className="text-[10px] text-gray-500">gezapft</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter */}
            <div className="mb-4 flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-400 mb-1">Nach Verkaufsstelle filtern</label>
                <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} className="w-full max-w-xs bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none">
                  <option value="">Alle Verkaufsstellen</option>
                  {salesPoints.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                {orderFilter && (
                  <button onClick={() => { setResetTarget(orderFilter); setShowResetConfirm(true); }} className="px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold border border-red-500/30">
                    🔄 {getSalesPointName(parseInt(orderFilter))} zurücksetzen
                  </button>
                )}
                <button onClick={() => { setResetTarget(""); setShowResetConfirm(true); }} className="px-3 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-sm font-bold border border-red-500/30">
                  🔄 Alle zurücksetzen
                </button>
              </div>
            </div>

            {totals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <div className="text-xs text-gray-400">Bestellungen</div>
                  <div className="text-2xl font-bold">{totals.totalOrders}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <div className="text-xs text-gray-400">Umsatz (Brutto)</div>
                  <div className="text-2xl font-bold text-green-400">{(totals.totalRevenue || 0).toFixed(2)} €</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <div className="text-xs text-gray-400">Pfand eingenommen</div>
                  <div className="text-2xl font-bold text-amber-400">{(totals.totalDepositsCharged || 0).toFixed(2)} €</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                  <div className="text-xs text-gray-400">Pfand ausgezahlt</div>
                  <div className="text-2xl font-bold text-red-400">-{(totals.totalDepositsReturned || 0).toFixed(2)} €</div>
                </div>
              </div>
            )}

            {drinkSummary.length > 0 && (
              <div className="mb-6">
                <h3 className="text-md font-bold mb-2">Getränke-Zusammenfassung</h3>
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 text-xs bg-gray-700/50">
                        <th className="text-left p-3 font-medium">Getränk</th>
                        <th className="text-right p-3 font-medium">Menge</th>
                        <th className="text-right p-3 font-medium">Umsatz</th>
                        <th className="text-right p-3 font-medium">Pfand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drinkSummary.map((item, i) => (
                        <tr key={i} className="border-t border-gray-700/50">
                          <td className="p-3 font-medium">{item.drinkName}</td>
                          <td className="p-3 text-right tabular-nums">{item.totalQuantity}</td>
                          <td className="p-3 text-right tabular-nums text-green-400">{(item.totalGross || 0).toFixed(2)} €</td>
                          <td className="p-3 text-right tabular-nums text-amber-400">{(item.totalDeposit || 0).toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <h3 className="text-md font-bold mb-2">Einzelbestellungen</h3>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Bestellungen vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm">Bestellung #{order.id}</div>
                      <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("de-DE")}</div>
                      <div className="text-xs text-blue-400 mt-0.5">{getSalesPointName(order.salesPointId)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">{order.totalGross.toFixed(2)} €</div>
                      <div className="text-xs text-gray-400">
                        Pfand: {order.totalDeposit.toFixed(2)} €
                        {order.totalDepositReturned > 0 && ` (−${order.totalDepositReturned.toFixed(2)} € zurück)`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drink form modal */}
      {showDrinkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveDrink} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingDrink ? "Getränk bearbeiten" : "Neues Getränk"}</h2>
            {formError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Pils" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nettopreis (€) *</label>
                  <input type="number" step="0.01" min="0" value={formData.priceNet} onChange={(e) => setFormData({ ...formData, priceNet: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="2.50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">MwSt.-Satz</label>
                  <select value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
                    <option value="19">19%</option>
                    <option value="7">7%</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.hasDeposit} onChange={(e) => setFormData({ ...formData, hasDeposit: e.target.checked })} className="w-5 h-5 rounded accent-amber-500" />
                  <span className="text-sm text-gray-300">Becherpfand aktivieren</span>
                </label>
              </div>
              {formData.hasDeposit && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Pfandbetrag (€)</label>
                  <input type="number" step="0.01" min="0" value={formData.depositAmount} onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isPourDrink} onChange={(e) => setFormData({ ...formData, isPourDrink: e.target.checked })} className="w-5 h-5 rounded accent-orange-500" />
                  <span className="text-sm text-gray-300">Zapfgetränk (Bier/Radler/Glühwein)</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Button-Farbe</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-12 h-10 rounded-lg border border-gray-600 cursor-pointer" />
                  <span className="text-sm text-gray-400 font-mono">{formData.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Bild-URL (optional)</label>
                <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sortierreihenfolge</label>
                <input type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Vorschau</label>
                <div className="rounded-xl p-4 text-white shadow-lg border border-white/10" style={{ backgroundColor: formData.color, backgroundImage: formData.imageUrl ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${formData.imageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
                  <div className="font-bold text-lg">{formData.name || "Getränkename"}</div>
                  <div className="text-2xl font-extrabold mt-1">
                    {formData.priceNet ? (parseFloat(formData.priceNet) * (1 + parseFloat(formData.taxRate) / 100)).toFixed(2) : "0.00"} €
                  </div>
                  {formData.hasDeposit && <div className="text-sm opacity-80">+ {parseFloat(formData.depositAmount || "0").toFixed(2)} € Pfand</div>}
                  {formData.isPourDrink && <div className="text-sm text-orange-400 font-bold mt-1">🍺 Zapfgetränk</div>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowDrinkForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Sales Point form modal */}
      {showSalesPointForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveSalesPoint} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Neue Verkaufsstelle</h2>
            {spFormError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{spFormError}</div>}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input type="text" value={spFormName} onChange={(e) => setSpFormName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" placeholder="z.B. Getränkewagen 3" autoFocus />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSalesPointForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Sales Point modal */}
      {editingSalesPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleUpdateSalesPoint} className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Verkaufsstelle bearbeiten</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input type="text" value={spEditName} onChange={(e) => setSpEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" autoFocus />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditingSalesPoint(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-3 text-center text-red-400">⚠️ Zähler zurücksetzen?</h2>
            <p className="text-sm text-gray-300 text-center mb-4">
              {resetTarget ? `Alle Bestellungen für "${getSalesPointName(parseInt(resetTarget))}" werden unwiderruflich gelöscht.` : "ALLE Bestellungen für ALLE Verkaufsstellen werden unwiderruflich gelöscht."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button onClick={handleResetCounters} className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 transition-all">Ja, löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Pour Reset Confirm modal */}
      {showPourResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-3 text-center text-red-400">⚠️ Zapf-Zähler zurücksetzen?</h2>
            <p className="text-sm text-gray-300 text-center mb-4">
              Alle Zapf-Statistiken und offenen Zapf-Aufträge werden unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowPourResetConfirm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500 transition-all">Abbrechen</button>
              <button onClick={handleResetPourStats} className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 transition-all">Ja, nullen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
