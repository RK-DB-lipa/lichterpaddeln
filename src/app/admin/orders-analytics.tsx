"use client";

import { useState, useEffect, useCallback } from "react";
import { exportOrdersCSV, exportDrinksCSV, exportFoodsCSV, exportPDFReport } from "./export-utils";

export default function OrdersAnalytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drinkSummary, setDrinkSummary] = useState<any[]>([]);
  const [foodSummary, setFoodSummary] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [hourlySummary, setHourlySummary] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [cashierSummary, setCashierSummary] = useState<any[]>([]);
  const [salesPointSummary, setSalesPointSummary] = useState<any[]>([]);
  const [salesPoints, setSalesPoints] = useState<any[]>([]);
  const [cashierNames, setCashierNames] = useState<string[]>([]);

  const [subTab, setSubTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Filter States
  const [filterSalesPoint, setFilterSalesPoint] = useState("");
  const [filterCashier, setFilterCashier] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterHour, setFilterHour] = useState("");

  const getActiveFilters = useCallback((): Record<string, string> => {
    const filters: Record<string, string> = {};
    if (filterSalesPoint) {
      const sp = salesPoints.find((s) => s.id === parseInt(filterSalesPoint));
      filters["Verkaufsstelle"] = sp?.name || filterSalesPoint;
    }
    if (filterCashier) filters["Mitarbeiter"] = filterCashier;
    if (filterDate) filters["Datum"] = filterDate;
    if (filterHour) filters["Stunde"] = `${filterHour}:00 - ${filterHour}:59`;
    return filters;
  }, [filterSalesPoint, filterCashier, filterDate, filterHour, salesPoints]);

  const fetchData = useCallback(async () => {
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
          if (parseInt(filterHour) === 23) {
            params.set("toTime", "23:59");
          } else {
            const endHour = (parseInt(filterHour) + 1) % 24;
            params.set("toTime", `${String(endHour).padStart(2, "0")}:00`);
          }
        }
      }
      
      const qs = params.toString();
      const url = qs ? `/api/orders?${qs}` : "/api/orders";
      
      const [ordersRes, spRes, namesRes] = await Promise.all([
        fetch(url),
        fetch("/api/sales-points"),
        fetch("/api/names?type=cashier"),
      ]);
      
      if (!ordersRes.ok) throw new Error(`API Fehler: ${ordersRes.status}`);
      
      const d = await ordersRes.json();
      setOrders(d.orders || []);
      setDrinkSummary(d.drinkSummary || []);
      setFoodSummary(d.foodSummary || []);
      setTotals(d.totals || null);
      setHourlySummary(d.hourlySummary || []);
      setDailySummary(d.dailySummary || []);
      setCashierSummary(d.cashierSummary || []);
      setSalesPointSummary(d.salesPointSummary || []);
      
      if (spRes.ok) setSalesPoints(await spRes.json());
      if (namesRes.ok) setCashierNames(await namesRes.json());
    } catch (err: any) {
      console.error("Fehler:", err);
      setError(err.message);
    }
    setLoading(false);
  }, [filterSalesPoint, filterCashier, filterDate, filterHour]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fmt = (n: any) => (n || 0).toFixed(2) + " €";

  // Export Handlers
  const handleExportOrdersCSV = () => {
    exportOrdersCSV(orders, getActiveFilters());
  };

  const handleExportDrinksCSV = () => {
    exportDrinksCSV(drinkSummary, getActiveFilters());
  };

  const handleExportFoodsCSV = () => {
    exportFoodsCSV(foodSummary, getActiveFilters());
  };

  const handleExportPDF = () => {
    exportPDFReport({
      totals,
      drinkSummary,
      foodSummary,
      salesPointSummary,
      cashierSummary,
      dailySummary,
      orders,
    }, getActiveFilters());
  };

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl">
        <h2 className="font-bold text-red-300 mb-2">❌ Fehler</h2>
        <p className="text-red-200">{error}</p>
        <button onClick={fetchData} className="mt-2 px-3 py-1.5 bg-red-700 rounded-lg text-sm">🔄 Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header mit Export-Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-lg font-bold">📊 Bestellungs-Auswertung</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-bold">
            🔄 Aktualisieren
          </button>
          <button onClick={handleExportPDF} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-bold">
            📄 PDF-Bericht
          </button>
        </div>
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
        <div className="flex justify-between items-center mt-2">
          {(filterSalesPoint || filterCashier || filterDate) ? (
            <button onClick={() => { setFilterSalesPoint(""); setFilterCashier(""); setFilterDate(""); setFilterHour(""); }} className="text-xs text-red-400 hover:text-red-300">
              ✕ Filter zurücksetzen
            </button>
          ) : (
            <span className="text-xs text-gray-500">Keine Filter aktiv</span>
          )}
          <div className="flex gap-2">
            <button onClick={handleExportOrdersCSV} className="px-2 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">
              📥 Bestellungen CSV
            </button>
            <button onClick={handleExportDrinksCSV} className="px-2 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">
              📥 Getränke CSV
            </button>
            <button onClick={handleExportFoodsCSV} className="px-2 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">
              📥 Speisen CSV
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2 border-b border-gray-700 overflow-x-auto">
        {[
          ["overview", "📈 Übersicht"],
          ["drinks", "🍺 Getränke"],
          ["foods", "🍔 Speisen"],
          ["timeline", "🕐 Tag & Stunde"],
          ["orders", "📋 Bestellungen"],
        ].map(([key, label]) => (
          <button 
            key={key} 
            onClick={() => setSubTab(key)} 
            className={`px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 ${subTab === key ? "border-amber-500 text-amber-400" : "border-transparent text-gray-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">⏳ Lade Daten...</div>
      ) : (
        <>
          {/* ÜBERSICHT */}
          {subTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-xs text-gray-400">Bestellungen</div>
                  <div className="text-2xl font-extrabold text-blue-400">{totals?.totalOrders || 0}</div>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <div className="text-xs text-gray-400">Umsatz (brutto)</div>
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
                    {salesPointSummary.map((sp, i) => (
                      <tr key={i} className="border-t border-gray-700/50">
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
              <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm flex justify-between items-center">
                <span>🍺 Getränke ({drinkSummary.length})</span>
                <button onClick={handleExportDrinksCSV} className="px-2 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">
                  📥 CSV Export
                </button>
              </div>
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
                    {drinkSummary.map((d, i) => {
                      const taxRate = d.taxRate ?? 19;
                      const net = +(d.totalGross / (1 + taxRate / 100)).toFixed(2);
                      return (
                        <tr key={i} className="border-t border-gray-700/50">
                          <td className="px-4 py-2 font-medium">{d.drinkName}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{d.totalQuantity}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-400">{fmt(d.totalGross)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-blue-400">{fmt(net)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-400">{fmt(d.totalDeposit || 0)}</td>
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
              <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm flex justify-between items-center">
                <span>🍔 Speisen ({foodSummary.length})</span>
                <button onClick={handleExportFoodsCSV} className="px-2 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">
                  📥 CSV Export
                </button>
              </div>
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
                    {foodSummary.map((f, i) => {
                      const taxRate = f.taxRate ?? 19;
                      const net = +(f.totalGross / (1 + taxRate / 100)).toFixed(2);
                      return (
                        <tr key={i} className="border-t border-gray-700/50">
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
                <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">📅 Umsatz nach Tag ({dailySummary.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700/50 text-gray-400 text-xs">
                      <tr>
                        <th className="px-4 py-2 text-left">Datum</th>
                        <th className="px-4 py-2 text-right">Bestellungen</th>
                        <th className="px-4 py-2 text-right">Umsatz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummary.map((d, i) => (
                        <tr key={i} className="border-t border-gray-700/50">
                          <td className="px-4 py-2 font-medium">{new Date(d.day).toLocaleDateString("de-DE")}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{d.orderCount}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-400 font-bold">{fmt(d.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-700 font-bold text-sm">🕐 Umsatz nach Stunde ({hourlySummary.length})</div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700/50 text-gray-400 text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Datum / Stunde</th>
                        <th className="px-4 py-2 text-right">Bestellungen</th>
                        <th className="px-4 py-2 text-right">Umsatz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hourlySummary.map((h, i) => (
                        <tr key={i} className="border-t border-gray-700/50">
                          <td className="px-4 py-2 font-medium">{h.dayHour}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{h.orderCount}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-green-400 font-bold">{fmt(h.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EINZELBESTELLUNGEN */}
          {subTab === "orders" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">{orders.length} Bestellungen</span>
                <button onClick={handleExportOrdersCSV} className="px-2 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-bold">
                  📥 CSV Export
                </button>
              </div>
              {orders.slice(0, 50).map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-3 border border-gray-700 text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold">#{order.id}</span>
                      <span className="ml-2 text-gray-400 text-sm">{order.salesPointName}</span>
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

      {/* Detail-Modal */}
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
