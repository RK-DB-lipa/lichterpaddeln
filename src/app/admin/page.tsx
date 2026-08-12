"use client";
import { useState, useEffect, useCallback } from "react";

// Types
type Drink = { id: number; name: string; priceGross: number; taxRate: number; hasDeposit: boolean; depositAmount: number; cupSize: string; color: string; imageUrl: string | null; isActive: boolean; sortOrder: number; isPourDrink: boolean; salesPointIds?: number[]; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type Food = { id: number; name: string; priceGross: number; taxRate: number; color: string; imageUrl: string | null; isActive: boolean; isCookItem: boolean; sortOrder: number; group?: string | null; reducedPrice?: number; reductionPercent?: number; hasReduction?: boolean; };
type PriceReduction = { id: number; itemId: number; itemType: "drink" | "food"; startTime: string; endTime: string; reductionPercent: number; isActive: boolean; };

const EMPTY_DRINK = { name: "", priceGross: "", taxRate: "19", hasDeposit: true, depositAmount: "2.00", cupSize: "04", color: "#3B82F6", imageUrl: "", sortOrder: "0", isPourDrink: false, salesPointIds: [] as number[], group: "" };

export default function AdminPage() {
  const [session, setSession] = useState<any>(undefined);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [priceReductions, setPriceReductions] = useState<PriceReduction[]>([]);
  const [activeTab, setActiveTab] = useState<string>("drinks");
  
  // Drink form
  const [editingDrink, setEditingDrink] = useState<Drink | null>(null);
  const [showDrinkForm, setShowDrinkForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_DRINK);
  const [formError, setFormError] = useState("");
  
  // Food form
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [foodFormData, setFoodFormData] = useState({ name: "", priceGross: "", taxRate: "19", color: "#10B981", imageUrl: "", isCookItem: false, group: "" });
  const [foodFormError, setFoodFormError] = useState("");
  
  // Price reduction form
  const [showReductionForm, setShowReductionForm] = useState(false);
  const [editingReduction, setEditingReduction] = useState<PriceReduction | null>(null);
  const [reductionFormData, setReductionFormData] = useState({ itemId: 0, itemType: "drink" as "drink" | "food", startTime: "22:00", endTime: "02:00", reductionPercent: 20 });

  const isSuperAdmin = session?.role === "admin" && session?.username === "admin";

  // Fetch functions
  const fetchDrinks = useCallback(async () => {
    try { const r = await fetch("/api/drinks"); if (r.ok) setDrinks(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchFoods = useCallback(async () => {
    try { const r = await fetch("/api/foods"); if (r.ok) setFoods(await r.json()); } catch (err) { console.error(err); }
  }, []);
  
  const fetchPriceReductions = useCallback(async () => {
    try { const r = await fetch("/api/price-reductions"); if (r.ok) setPriceReductions(await r.json()); } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { 
    const checkAuth = async () => {
      try { const r = await fetch("/api/auth/me"); if (r.ok) setSession(await r.json()); else setSession(null); } catch { setSession(null); }
    };
    checkAuth();
  }, []);

  useEffect(() => { 
    if (session) { 
      fetchDrinks(); 
      fetchFoods(); 
      fetchPriceReductions();
    } 
  }, [session, fetchDrinks, fetchFoods, fetchPriceReductions]);

  // API helper
  async function api(path: string, method: string, body?: any) { 
    const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); 
    if (!r.ok) throw new Error((await r.json()).error || "API-Fehler"); 
    return r.json(); 
  }

  // Drink handlers
  async function handleSaveDrink(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!formData.name || !formData.priceGross) { setFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: formData.name, priceGross: parseFloat(formData.priceGross), taxRate: parseFloat(formData.taxRate), hasDeposit: formData.hasDeposit, depositAmount: parseFloat(formData.depositAmount), cupSize: formData.cupSize, color: formData.color, imageUrl: formData.imageUrl || null, sortOrder: parseInt(formData.sortOrder) || 0, isPourDrink: formData.isPourDrink, salesPointIds: formData.salesPointIds || [], group: formData.group || null };
      if (editingDrink) await api(`/api/drinks/${editingDrink.id}`, "PUT", p); 
      else await api("/api/drinks", "POST", p);
      setShowDrinkForm(false); 
      setEditingDrink(null);
      fetchDrinks();
    } catch (err: any) { setFormError(err.message); }
  }

  async function handleDeleteDrink(id: number) { 
    if (!confirm("Getränk deaktivieren?")) return; 
    try { await api(`/api/drinks/${id}`, "DELETE"); fetchDrinks(); } catch (err) { console.error(err); } 
  }

  // Food handlers
  async function handleSaveFood(e: React.FormEvent) {
    e.preventDefault(); setFoodFormError("");
    if (!foodFormData.name || !foodFormData.priceGross) { setFoodFormError("Name und Bruttopreis erforderlich"); return; }
    try {
      const p = { name: foodFormData.name, priceGross: parseFloat(foodFormData.priceGross), taxRate: parseFloat(foodFormData.taxRate), color: foodFormData.color, imageUrl: foodFormData.imageUrl || null, isCookItem: foodFormData.isCookItem, group: foodFormData.group || null };
      if (editingFood) await api(`/api/foods/${editingFood.id}`, "PUT", p);
      else await api("/api/foods", "POST", p);
      setShowFoodForm(false); 
      setEditingFood(null);
      fetchFoods();
    } catch (err: any) { setFoodFormError(err.message); }
  }

  async function handleDeleteFood(id: number) {
    if (!confirm("Speise deaktivieren?")) return;
    try { await api(`/api/foods/${id}`, "DELETE"); fetchFoods(); }
    catch (err) { console.error(err); }
  }

  // Price reduction handlers
  async function handleSaveReduction(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingReduction) {
        await api(`/api/price-reductions/${editingReduction.id}`, "PUT", reductionFormData);
      } else {
        await api("/api/price-reductions", "POST", reductionFormData);
      }
      setShowReductionForm(false);
      setEditingReduction(null);
      fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler beim Speichern"); }
  }

  async function handleDeleteReduction(id: number) {
    if (!confirm("Preisaktion wirklich löschen?")) return;
    try {
      await api(`/api/price-reductions/${id}`, "DELETE");
      fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler beim Löschen"); }
  }

  async function handleToggleReduction(id: number, isActive: boolean) {
    try {
      await api(`/api/price-reductions/${id}`, "PUT", { isActive: !isActive });
      fetchPriceReductions();
    } catch (err: any) { alert(err.message || "Fehler beim Umschalten"); }
  }

  function openEditDrink(d: Drink) {
    setEditingDrink(d);
    setFormData({
      name: d.name, priceGross: d.priceGross.toString(), taxRate: d.taxRate.toString(),
      hasDeposit: d.hasDeposit, depositAmount: d.depositAmount.toString(), cupSize: d.cupSize,
      color: d.color, imageUrl: d.imageUrl || "", sortOrder: d.sortOrder.toString(),
      isPourDrink: d.isPourDrink, salesPointIds: d.salesPointIds || [], group: d.group || "",
    });
    setFormError("");
    setShowDrinkForm(true);
  }

  function openEditFood(f: Food) {
    setEditingFood(f);
    setFoodFormData({ name: f.name, priceGross: f.priceGross.toString(), taxRate: f.taxRate.toString(), color: f.color, imageUrl: f.imageUrl || "", isCookItem: f.isCookItem, group: f.group || "" });
    setFoodFormError("");
    setShowFoodForm(true);
  }

  async function handleLogout() { 
    await fetch("/api/auth/logout", { method: "POST" }); 
    setSession(null); 
  }

  if (session === undefined) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><p>Laden...</p></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 Admin-Anmeldung</h1>
          <p className="text-sm text-gray-400 text-center mb-4">Zugriff nur für Administratoren</p>
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

      <div className="flex border-b border-gray-700 shrink-0">
        <button onClick={() => setActiveTab("drinks")} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === "drinks" ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>🍺 Getränke</button>
        <button onClick={() => setActiveTab("foods")} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === "foods" ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>🍔 Speisen</button>
        <button onClick={() => setActiveTab("reductions")} className={`flex-1 py-3 text-center font-bold text-sm ${activeTab === "reductions" ? "border-b-2 border-amber-500 text-amber-400" : "text-gray-400"}`}>💰 Preisaktionen</button>
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full overflow-y-auto">
        {/* DRINKS TAB */}
        {activeTab === "drinks" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Getränke</h2>
              <button onClick={() => { setEditingDrink(null); setFormData({...EMPTY_DRINK}); setFormError(""); setShowDrinkForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neues Getränk</button>
            </div>
            <div className="space-y-2">
              {drinks.map((d) => (
                <div key={d.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor: d.color}}>{d.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{d.name}</div>
                    <div className="text-xs text-gray-400">
                      {d.priceGross.toFixed(2)} € · {d.taxRate}% MwSt.
                      {d.hasReduction && <span className="ml-2 text-green-400 font-bold">-{d.reductionPercent}%</span>}
                    </div>
                  </div>
                  <button onClick={() => openEditDrink(d)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteDrink(d.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOODS TAB */}
        {activeTab === "foods" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Speisen</h2>
              <button onClick={() => { setEditingFood(null); setFoodFormData({ name: "", priceGross: "", taxRate: "19", color: "#10B981", imageUrl: "", isCookItem: false, group: "" }); setFoodFormError(""); setShowFoodForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Speise</button>
            </div>
            <div className="space-y-2">
              {foods.map((f) => (
                <div key={f.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3 border border-gray-700">
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{backgroundColor: f.color}}>{f.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{f.name}</div>
                    <div className="text-xs text-gray-400">
                      {f.priceGross.toFixed(2)} € · {f.taxRate}% MwSt.
                      {f.hasReduction && <span className="ml-2 text-green-400 font-bold">-{f.reductionPercent}%</span>}
                    </div>
                  </div>
                  <button onClick={() => openEditFood(f)} className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDeleteFood(f.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-sm">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRICE REDUCTIONS TAB */}
        {activeTab === "reductions" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">💰 Zeitgesteuerte Preisaktionen</h2>
              <button onClick={() => { setEditingReduction(null); setReductionFormData({ itemId: 0, itemType: "drink", startTime: "22:00", endTime: "02:00", reductionPercent: 20 }); setShowReductionForm(true); }} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm">+ Neue Aktion</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Definiere zeitbasierte Preisreduktionen für Getränke und Speisen.</p>
            <div className="space-y-2">
              {priceReductions.map((red) => {
                const item = red.itemType === "drink" 
                  ? drinks.find(d => d.id === red.itemId)
                  : foods.find(f => f.id === red.itemId);
                return (
                  <div key={red.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-bold">
                          {item ? item.name : "Unbekannt"} ({red.itemType === "drink" ? "🍺" : "🍔"})
                        </div>
                        <div className="text-sm text-gray-400">
                          {red.startTime} - {red.endTime} Uhr · {red.reductionPercent}% Rabatt
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleReduction(red.id, red.isActive)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${red.isActive ? "bg-green-700 hover:bg-green-600" : "bg-gray-600 hover:bg-gray-500"}`}>
                          {red.isActive ? "✅ Aktiv" : "⏸️ Inaktiv"}
                        </button>
                        <button onClick={() => handleDeleteReduction(red.id)} className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-xs font-bold">🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {priceReductions.length === 0 && <p className="text-gray-500 text-center py-8">Noch keine Preisaktionen angelegt.</p>}
            </div>
          </div>
        )}
      </div>

      {/* DRINK FORM MODAL */}
      {showDrinkForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveDrink} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingDrink ? "Getränk bearbeiten" : "Neues Getränk"}</h2>
            {formError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bruttopreis (€)</label>
                  <input type="number" step="0.01" value={formData.priceGross} onChange={(e) => setFormData({...formData, priceGross: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">MwSt. (%)</label>
                  <input type="number" value={formData.taxRate} onChange={(e) => setFormData({...formData, taxRate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowDrinkForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* FOOD FORM MODAL */}
      {showFoodForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveFood} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingFood ? "Speise bearbeiten" : "Neue Speise"}</h2>
            {foodFormError && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-700">{foodFormError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input type="text" value={foodFormData.name} onChange={(e) => setFoodFormData({...foodFormData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Bruttopreis (€)</label>
                  <input type="number" step="0.01" value={foodFormData.priceGross} onChange={(e) => setFoodFormData({...foodFormData, priceGross: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">MwSt. (%)</label>
                  <input type="number" value={foodFormData.taxRate} onChange={(e) => setFoodFormData({...foodFormData, taxRate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowFoodForm(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500">Speichern</button>
            </div>
          </form>
        </div>
      )}

      {/* PRICE REDUCTION FORM MODAL */}
      {showReductionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={handleSaveReduction} className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4">{editingReduction ? "Preisaktion bearbeiten" : "Neue Preisaktion"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Typ</label>
                <select value={reductionFormData.itemType} onChange={(e) => setReductionFormData({ ...reductionFormData, itemType: e.target.value as "drink" | "food" })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
                  <option value="drink">🍺 Getränk</option>
                  <option value="food">🍔 Speise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{reductionFormData.itemType === "drink" ? "Getränk" : "Speise"}</label>
                <select value={reductionFormData.itemId} onChange={(e) => setReductionFormData({ ...reductionFormData, itemId: parseInt(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none">
                  <option value={0}>Bitte wählen...</option>
                  {(reductionFormData.itemType === "drink" ? drinks : foods).map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.priceGross.toFixed(2)} €)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Startzeit (HH:MM)</label>
                  <input type="time" value={reductionFormData.startTime} onChange={(e) => setReductionFormData({ ...reductionFormData, startTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Endzeit (HH:MM)</label>
                  <input type="time" value={reductionFormData.endTime} onChange={(e) => setReductionFormData({ ...reductionFormData, endTime: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rabatt in %</label>
                <input type="number" min="0" max="100" value={reductionFormData.reductionPercent} onChange={(e) => setReductionFormData({ ...reductionFormData, reductionPercent: parseFloat(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setShowReductionForm(false); setEditingReduction(null); }} className="flex-1 py-3 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Abbrechen</button>
              <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500">Speichern</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
