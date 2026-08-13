"use client";

import { useState, useEffect, useCallback } from "react";

type OrderItemDetail = { drinkId: number; drinkName: string; quantity: number; unitPriceGross: number; unitDeposit: number; totalPriceGross: number; totalDeposit: number };
type FoodItemDetail = { foodId: number; foodName: string; quantity: number; unitPriceGross: number; totalPriceGross: number };
type Order = {
  id: number; salesPointId: number; salesPointName: string | null; totalGross: number;
  totalDeposit: number; totalDepositReturned: number; netDeposit: number;
  cashierName: string | null; createdAt: string;
  items: OrderItemDetail[]; foodItems: FoodItemDetail[];
};
type DrinkSummary = { drinkName: string; totalQuantity: number; totalGross: number; totalDeposit: number; taxRate: number | null };
type FoodSummary = { foodName: string; totalQuantity: number; totalGross: number; taxRate: number | null };
type Totals = { totalOrders: number; totalRevenue: number; totalDepositsCharged: number; totalDepositsReturned: number; netDeposits: number };
type HourlyStat = { dayHour: string; orderCount: number; revenue: number };
type DailyStat = { day: string; orderCount: number; revenue: number };
type CashierStat = { cashierName: string | null; orderCount: number; revenue: number };
type SalesPointStat = { salesPointId: number; salesPointName: string | null; orderCount: number; revenue: number };
type SalesPoint = { id: number; name: string };

const toNet = (gross: number, taxRate: number) => +(gross / (1 + taxRate / 100)).toFixed(2);

export default function OrdersAnalytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drinkSummary, setDrinkSummary] = useState<DrinkSummary[]>([]);
  const [foodSummary, setFoodSummary] = useState<FoodSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [hourlySummary, setHourlySummary] = useState<HourlyStat[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyStat[]>([]);
  const [cashierSummary, setCashierSummary] = useState<CashierStat[]>([]);
  const [salesPointSummary, setSalesPointSummary] = useState<SalesPointStat[]>([]);
  const [salesPoints, setSalesPoints] = useState<SalesPoint[]>([]);
  const [cashierNames, setCashierNames] = useState<string[]>([]);

  const [subTab, setSubTab] = useState<"overview" | "drinks" | "foods" | "timeline" | "orders">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterSalesPoint, setFilterSalesPoint] = useState<string>("");
  const [filterCashier, setFilterCashier] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterHour, setFilterHour] = useState<string>("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchSalesPoints = useCallback(async () => {
    try { const r = await fetch("/api/sales-points"); if (r.ok) setSalesPoints(await r.json()); } catch (e) { console.error("Sales Points Error:", e); }
  }, []);

  const fetchCashierNames = useCallback(async () => {
    try { const r = await fetch("/api/names?type=cashier"); if (r.ok) setCashierNames(await r.json()); } catch (e) { console.error("Cashier Names Error:", e); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterSalesPoint) params.set("salesPointId", filterSalesPoint);
      if (filterCashier) params.set("cashierName", filterCashier);
      if (filterDate) {
        params.set("fromDate", filterDate);
        params.set("toDate", filterDate);
        if (filterHour) {
          params.set("fromTime", `${filterHour}:00`);
          const endHour = (parseInt(filterHour) + 1) % 24;
          if (parseInt(filterHour) === 23) {
            params.set("toTime", "23:59");
          } else {
            params.set("toTime", `${String(endHour).padStart(2, "0")}:00`);
          }
        }
      }
      const qs = params.toString();
      const url = qs ? `/api/orders?${qs}` : "/api/orders";
      console.log("Fetching:", url);
      
      const r = await fetch(url);
      
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(`API Error ${r.status}: ${errorText}`);
      }
      
      const d = await r.json();
      console.log("API Response:", d);
      
      setOrders(d.orders || []);
      setDrinkSummary(d.drinkSummary || []);
      setFoodSummary(d.foodSummary || []);
      setTotals(d.totals || null);
      setHourlySummary(d.hourlySummary || []);
      setDailySummary(d.dailySummary || []);
      setCashierSummary(d.cashierSummary || []);
      setSalesPointSummary(d.salesPointSummary || []);
    } catch (err: any) {
      console.error("Fetch Orders Error:", err);
      setError(err.message || "Unbekannter Fehler beim Laden der Daten");
    }
    setLoading(false);
  }, [filterSalesPoint, filterCashier, filterDate, filterHour]);

  useEffect(() => { 
    console.log("OrdersAnalytics mounted");
    fetchSalesPoints(); 
    fetchCashierNames(); 
  }, [fetchSalesPoints, fetchCashierNames]);
  
  useEffect(() => { 
    console.log("Fetching orders with filters:", { filterSalesPoint, filterCashier, filterDate, filterHour });
    fetchOrders(); 
  }, [fetchOrders]);

  const fmt = (n: number | null | undefined) => (n ?? 0).toFixed(2) + " €";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">📊 Bestellungs-Auswertung</h2>
        <button onClick={fetchOrders} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-bold">🔄 Aktualisieren</button>
      </div>

      {/* Filter-Leiste */}
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Verkaufsstelle</label>
            <select value={filterSalesPoint} onChange={(e) => setFilterSalesPoint(e.target.value)} className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600">
              <option value="">Alle</option>
              {salesPoints.map((sp) => (<option key={sp.id} value={sp.id}>{sp.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mitarbeiter</label>
            <select value={filterCashier} onChange={(e) => setFilterCashier(e.target.value)} className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600">
              <option value="">Alle</option>
              {cashierNames.map((name) => (<option key={name} value={name}>{name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Datum</label>
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Stunde</label>
            <select value={filterHour} onChange={(e) => setFilterHour(e.target.value)} disabled={!filterDate} className="w-full bg-gray-700 text-white text-sm rounded-lg px-2 py-1.5 border border-gray-600 disabled:opacity-50">
              <option value="">Ganzer Tag</option>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (<option key={h} value={h}>{h}:00 - {h}:59</option>))}
            </select>
          </div>
        </div>
        {(filterSalesPoint || filterCashier || filterDate) && (
          <button onClick={() => { setFilterSalesPoint(""); setFilterCashier(""); setFilterDate(""); setFilterHour(""); }} className="mt-2 text-xs text-red-400 hover:text-red-300">✕ Filter zurücksetzen</button>
        )}
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-1 border-b border-gray-700 overflow-x-auto">
        {[
          ["overview", "📈 Übersicht"],
          ["drinks", "🍺 Getränke"],
          ["foods", "🍔 Speisen"],
          ["timeline", "🕐 Tag & Stunde"],
          ["orders", "📋 Einzelbestellungen"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key as any)} className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${subTab === key ? "border-amber-500 text-amber-400" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ✅ NEU: Error-Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-xl">⚠️</span>
            <span className="font-bold text-red-300">Fehler beim Laden der Daten</span>
          </div>
          <p className="text-sm text-red-200 mb-2">{error}</p>
          <button onClick={fetchOrders} className="text-xs bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg font-bold">🔄 Erneut versuchen</button>
        </div>
      )}

      {/* ✅ NEU: Debug-Info wenn keine Daten */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400 text-xl">ℹ️</span>
            <span className="font-bold text-amber-300">Keine Bestellungen gefunden</span>
          </div>
          <p className="text-sm text-amber-200">Es wurden keine Bestellungen mit den aktuellen Filtern gefunden. Versuche die Filter zurückzusetzen oder erstelle eine Test-Bestellung in der Kasse.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-2xl mb-2">⏳</div>
          <div>Lade Daten...</div>
        </div>
      ) : (
        <>
          {/* ÜBERSICHT */}
          {subTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-xs text-gray-400">Bestellungen</div>
                  <div className="text-2xl font-extrabold text-blue-400">{totals?.totalOrders ?? 0}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-xs text-gray-400">Gesamtumsatz (brutto)</div>
                  <div className="text-2xl font-extrabold text-green-400">{fmt(totals?.totalRevenue)}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-xs text-gray-400">Pfand eingenommen</div>
                  <div className="text-2xl font-extrabold text-amber-400">{fmt(totals?.totalDepositsCharged)}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-xs text-gray-400">Pfand-Saldo</div>
                  <div className="text-2xl font-extrabold text-purple-400">{fmt(totals?.netDeposits)}</div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">🏪 Nach Verkaufsstelle</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50 text-gray-400 text-xs">
                    <tr><th className="px-4 py-2 text-left">Verkaufsstelle</th><th className="px-4 py-2 text-right">Bestellungen</th><th className="px-4 py-2 text-right">Umsatz</th></tr>
                  </thead>
                  <tbody>
                    {salesPointSummary.map((sp) => (
                      <tr key={sp.salesPointId} className="border-t border-gray-700/50">
                        <td className="px-4 py-2">{sp.salesPointName || `ID ${sp.salesPointId}`}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{sp.orderCount}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-green-400 font-bold">{fmt(sp.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">👤 Nach Mitarbeiter</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50 text-gray-400 text-xs">
                    <tr><th className="px-4 py-2 text-left">Mitarbeiter</th><th className="px-4 py-2 text-right">Bestellungen</th><th className="px-4 py-2 text-right">Umsatz</th></tr>
                  </thead>
                  <tbody>
                    {cashierSummary.map((c, i) => (
                      <tr key={i} className="border-t border-gray-700/50">
                        <td className="px-4 py-2">{c.cashierName || "(unbekannt)"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{c.orderCount}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-green-400 font-bold">{fmt(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GETRÄNKE */}
          {subTab === "drinks" && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">🍺 Getränke-Auswertung ({drinkSummary.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50 text-gray-400 text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Getränk</th>
                      <th className="px-4 py-2 text-right">Menge</th>
                      <th className="px-4 py-2 text-right">Umsatz brutto</th>
                      <th className="px-4 py-2 text-right">Umsatz netto</th>
                      <th className="px-4 py-2 text-right">Pfand</th>
                      <th className="px-4 py-2 text-right">MwSt.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drinkSummary.map((d) => {
                      const taxRate = d.taxRate ?? 19;
                      const net = toNet(d.totalGross, taxRate);
                      return (
                        <tr key={d.drinkName} className="border-t border-gray-700/50">
                          <td className="px-4 py-2 font-medium">{d.drinkName}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{d.totalQuantity}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-400">{fmt(d.totalGross)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-blue-400">{fmt(net)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-400">{fmt(d.totalDeposit)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-400">{taxRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SPEISEN */}
          {subTab === "foods" && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">🍔 Speisen-Auswertung ({foodSummary.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50 text-gray-400 text-xs">
                    <tr>
                      <th className="px-4 py-2 text-left">Speise</th>
                      <th className="px-4 py-2 text-right">Menge</th>
                      <th className="px-4 py-2 text-right">Umsatz brutto</th>
                      <th className="px-4 py-2 text-right">Umsatz netto</th>
                      <th className="px-4 py-2 text-right">MwSt.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodSummary.map((f) => {
                      const taxRate = f.taxRate ?? 19;
                      const net = toNet(f.totalGross, taxRate);
                      return (
                        <tr key={f.foodName} className="border-t border-gray-700/50">
                          <td className="px-4 py-2 font-medium">{f.foodName}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{f.totalQuantity}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-400">{fmt(f.totalGross)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-blue-400">{fmt(net)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-400">{taxRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAG & STUNDE */}
          {subTab === "timeline" && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">📅 Umsatz nach Tag</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700/50 text-gray-400 text-xs">
                      <tr><th className="px-4 py-2 text-left">Datum</th><th className="px-4 py-2 text-right">Bestellungen</th><th className="px-4 py-2 text-right">Umsatz</th><th className="px-4 py-2 text-left w-1/3">Visualisierung</th></tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const maxRev = Math.max(...dailySummary.map((d) => d.revenue), 1);
                        return dailySummary.map((d) => (
                          <tr key={d.day} className="border-t border-gray-700/50">
                            <td className="px-4 py-2 font-medium">{new Date(d.day).toLocaleDateString("de-DE")}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{d.orderCount}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-400 font-bold">{fmt(d.revenue)}</td>
                            <td className="px-4 py-2">
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(d.revenue / maxRev) * 100}%` }} />
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">🕐 Umsatz nach Stunde</div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700/50 text-gray-400 text-xs sticky top-0">
                      <tr><th className="px-4 py-2 text-left">Datum / Stunde</th><th className="px-4 py-2 text-right">Bestellungen</th><th className="px-4 py-2 text-right">Umsatz</th><th className="px-4 py-2 text-left w-1/3">Visualisierung</th></tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const maxRev = Math.max(...hourlySummary.map((h) => h.revenue), 1);
                        return hourlySummary.map((h) => {
                          const [datePart, hourPart] = h.dayHour.split(" ");
                          return (
                            <tr key={h.dayHour} className="border-t border-gray-700/50">
                              <td className="px-4 py-2 font-medium">{new Date(datePart).toLocaleDateString("de-DE")} · {hourPart}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{h.orderCount}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-green-400 font-bold">{fmt(h.revenue)}</td>
                              <td className="px-4 py-2">
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(h.revenue / maxRev) * 100}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EINZELBESTELLUNGEN */}
          {subTab === "orders" && (
            <div className="space-y-2">
              <div className="text-sm text-gray-400">{orders.length} Bestellungen</div>
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-3 border border-gray-700 text-left transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold">#{order.id}</span>
                      <span className="ml-2 text-gray-400 text-sm">{order.salesPointName || `Stelle ${order.salesPointId}`}</span>
                      <span className="ml-2 text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("de-DE")}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400 tabular-nums">{fmt(order.totalGross)}</div>
                      <div className="text-xs text-gray-400">👤 {order.cashierName || "unbekannt"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-600 shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">📋 Bestellung #{selectedOrder.id}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-700/50 rounded-lg p-2"><span className="text-gray-400 text-xs block">Verkaufsstelle</span>{selectedOrder.salesPointName || `ID ${selectedOrder.salesPointId}`}</div>
                <div className="bg-gray-700/50 rounded-lg p-2"><span className="text-gray-400 text-xs block">Mitarbeiter</span>{selectedOrder.cashierName || "unbekannt"}</div>
                <div className="bg-gray-700/50 rounded-lg p-2 col-span-2"><span className="text-gray-400 text-xs block">Zeitpunkt</span>{new Date(selectedOrder.createdAt).toLocaleString("de-DE")}</div>
              </div>

              {selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-2 text-blue-400">🍺 Getränke</h4>
                  <div className="space-y-1">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-700/30 rounded-lg px-3 py-2">
                        <span>{item.quantity}× {item.drinkName}</span>
                        <span className="tabular-nums font-bold">{fmt(item.totalPriceGross)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.foodItems.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-2 text-green-400">🍔 Speisen</h4>
                  <div className="space-y-1">
                    {selectedOrder.foodItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm bg-gray-700/30 rounded-lg px-3 py-2">
                        <span>{item.quantity}× {item.foodName}</span>
                        <span className="tabular-nums font-bold">{fmt(item.totalPriceGross)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-700/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Waren brutto</span><span className="tabular-nums font-bold">{fmt(selectedOrder.totalGross)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pfand berechnet</span><span className="tabular-nums text-amber-400">+{fmt(selectedOrder.totalDeposit)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Pfand zurückgegeben</span><span className="tabular-nums text-red-400">-{fmt(selectedOrder.totalDepositReturned)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-1 mt-1"><span className="font-bold">Gesamt</span><span className="tabular-nums font-extrabold text-green-400 text-lg">{fmt(selectedOrder.totalGross + selectedOrder.netDeposit)}</span></div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-700">
              <button onClick={() => setSelectedOrder(null)} className="w-full py-2.5 rounded-xl font-bold bg-gray-600 hover:bg-gray-500">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
