"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "../components/appShell";
import { AlertTriangle, Clock, Pencil } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";


type Batch = {
  status: string;
  cost: number | null;
  quantity_kg: string | null;
  production_date: string | null;
  products: { name: string } | null;
};

type Material = {
  id: string;
  name: string;
  expiry_date: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  testing: "#64748b",
  passed: "#15803d",
  failed: "#b91c1c",
  completed: "#2563eb",
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { count: productsCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });
      setProductCount(productsCount ?? 0);

      const { data: batchesData } = await supabase
        .from("batches")
        .select("status, cost, quantity_kg, production_date, products ( name )");
      setBatches((batchesData as unknown as Batch[]) ?? []);

      const { data: materialsData } = await supabase
        .from("raw_materials")
        .select("id, name, expiry_date");
      setMaterials(materialsData ?? []);

      setLoading(false);
    }
    load();
  }, []);

  const totalBatches = batches.length;
  const totalCost = batches.reduce((sum, b) => sum + (b.cost ?? 0), 0);

  const passedCount = batches.filter((b) => b.status === "passed").length;
  const failedCount = batches.filter((b) => b.status === "failed").length;
  const evaluatedCount = passedCount + failedCount;
  const successRate = evaluatedCount > 0 ? Math.round((passedCount / evaluatedCount) * 100) : null;

  // --- Pie: batches grouped by status ---
  const statusCounts = batches.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // --- Bar: total cost grouped by product name ---
  const costByProduct = batches.reduce<Record<string, number>>((acc, b) => {
    const name = b.products?.name ?? "Unassigned";
    acc[name] = (acc[name] ?? 0) + (b.cost ?? 0);
    return acc;
  }, {});
  const costChartData = Object.entries(costByProduct)
    .map(([name, cost]) => ({ name, cost }))
    .sort((a, b) => b.cost - a.cost);

  // --- Line: total quantity produced grouped by month ---
  const quantityByMonth = batches.reduce<Record<string, number>>((acc, b) => {
    if (!b.production_date) return acc;
    const monthIndex = new Date(b.production_date).getMonth();
    const label = MONTH_LABELS[monthIndex];
    acc[label] = (acc[label] ?? 0) + Number(b.quantity_kg ?? 0);
    return acc;
  }, {});
  const productionChartData = MONTH_LABELS.filter((m) => quantityByMonth[m] != null).map(
    (month) => ({ month, quantity: quantityByMonth[month] })
  );

  // --- Stage ribbon: how many batches sit in each status ---
  const STAGES: { key: string; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "testing", label: "Testing" },
    { key: "passed", label: "Passed" },
    { key: "failed", label: "Failed" },
    { key: "completed", label: "Completed" },
  ];

  // --- Real alerts, derived from actual data (no fake copy) ---
  const failedBatchAlerts = batches
    .filter((b) => b.status === "failed")
    .map((b) => b.products?.name ?? "Unknown product");

  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);
  const expiringMaterials = materials.filter((m) => {
    if (!m.expiry_date) return false;
    const exp = new Date(m.expiry_date);
    return exp >= today && exp <= in7Days;
  });

  const hasAlerts = failedBatchAlerts.length > 0 || expiringMaterials.length > 0;

  if (loading)
          return (
            <AppShell active="dashboard" title="dashboard" subtitle="Certificates you can download and hand over">
              <p className="text-gray-500">Loading...</p>
            </AppShell>
          );

  return (
    <AppShell active="dashboard" title="Dashboard" subtitle="Live data from your factory">
      {/* KPIs */}
      <div className="grid grid-cols-4 border border-gray-200 rounded-lg overflow-hidden bg-white mb-6">
        <div className="p-5 border-r border-gray-200">
          <p className="text-xs text-gray-500">Products in catalogue</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{productCount}</p>
        </div>
        <div className="p-5 border-r border-gray-200">
          <p className="text-xs text-gray-500">Batches produced</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{totalBatches}</p>
        </div>
        <div className="p-5 border-r border-gray-200">
          <p className="text-xs text-gray-500">Success rate</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">
            {successRate != null ? `${successRate}%` : "—"}
          </p>
          {evaluatedCount === 0 && (
            <p className="text-xs text-gray-400 mt-1">No batches tested yet</p>
          )}
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500">Total cost</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">
            ${totalCost.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stage ribbon */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Where every batch stands right now
          </h2>
          <span className="text-xs text-gray-400">{totalBatches} total</span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {STAGES.map((stage) => (
            <div
              key={stage.key}
              className="border-t-[3px] pt-2"
              style={{ borderColor: STATUS_COLORS[stage.key] }}
            >
              <div className="text-xs text-gray-500">{stage.label}</div>
              <div className="text-xl font-bold mt-0.5">{statusCounts[stage.key] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts, derived from real data — not mock copy */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Needs attention</h2>
        {!hasAlerts ? (
          <p className="text-sm text-gray-400">Nothing needs attention right now.</p>
        ) : (
          <div className="grid gap-2">
            {failedBatchAlerts.map((name, i) => (
              <div
                key={`f-${i}`}
                className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5"
              >
                <div className="w-7 h-7 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={14} className="text-red-600" />
                </div>
                <p className="text-sm text-gray-700">
                  A batch of <b>{name}</b> failed its quality check.
                </p>
              </div>
            ))}
            {expiringMaterials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5"
              >
                <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-amber-600" />
                </div>
                <p className="text-sm text-gray-700">
                  <b>{m.name}</b> expires on {m.expiry_date}.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalBatches === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-sm text-gray-400">
          No batches yet — start one to see these charts fill in.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie: status distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Quality outcome</h2>
              <span className="text-xs text-gray-400">{totalBatches} lots</span>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              {successRate != null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-6">
                  <span className="text-3xl font-bold text-gray-800">{successRate}%</span>
                  <span className="text-[11px] text-gray-400">passed of tested</span>
                </div>
              )}
            </div>
          </div>

          {/* Bar: cost per product */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Cost per product</h2>
              <span className="text-xs text-gray-400">this period</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Bar dataKey="cost" fill="#15803d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line: monthly production */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 md:col-span-2">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Output by month</h2>
              <span className="text-xs text-gray-400">kg produced</span>
            </div>
            {productionChartData.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">
                No batches have a production date yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={productionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#15803d"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}