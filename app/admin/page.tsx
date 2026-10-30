"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import AppShell from "../components/appShell";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type FactoryRow = {
  factory_id: string;
  factory_name: string;
  created_at: string;
  users_count: number;
  products_count: number;
  batches_count: number;
  passed_count: number;
  failed_count: number;
};

function successRate(passed: number, failed: number) {
  const tested = passed + failed;
  return tested > 0 ? Math.round((passed / tested) * 100) : null;
}

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FactoryRow[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: isAdmin } = await supabase.rpc("is_platform_admin");
      if (!isAdmin) {
        router.push("/dashboard");
        return;
      }

      const { data, error: overviewError } = await supabase.rpc("admin_factory_overview");
      if (overviewError) {
        setError(overviewError.message);
      } else {
        setRows((data as FactoryRow[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="p-10 text-gray-500">Loading...</p>;

  const totalUsers = rows.reduce((s, r) => s + r.users_count, 0);
  const totalBatches = rows.reduce((s, r) => s + r.batches_count, 0);
  const totalPassed = rows.reduce((s, r) => s + r.passed_count, 0);
  const totalFailed = rows.reduce((s, r) => s + r.failed_count, 0);
  const platformRate = successRate(totalPassed, totalFailed);

  const chartData = [...rows]
    .sort((a, b) => b.batches_count - a.batches_count)
    .slice(0, 8)
    .map((r) => ({ name: r.factory_name, batches: r.batches_count }));


    if (loading)
                return (
                  <AppShell active="admin" title="admin" subtitle="Certificates you can download and hand over">
                    <p className="text-gray-500">Loading...</p>
                  </AppShell>
                );

  return (
    <AppShell
      active="admin"
      title="Admin console"
      subtitle="Across all factories on the platform"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6">
          Couldn&apos;t load the overview: {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 border border-gray-200 rounded-lg overflow-hidden bg-white mb-6">
        <div className="p-5 border-r border-gray-200">
          <p className="text-xs text-gray-500">Factories</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{rows.length}</p>
        </div>
        <div className="p-5 border-r border-gray-200">
          <p className="text-xs text-gray-500">Users</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{totalUsers}</p>
        </div>
        <div className="p-5 border-r border-gray-200">
          <p className="text-xs text-gray-500">Batches</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">{totalBatches}</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500">Platform success rate</p>
          <p className="text-3xl font-bold mt-1 tracking-tight">
            {platformRate != null ? `${platformRate}%` : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      {rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800">Batches per factory</h2>
            <span className="text-xs text-gray-400">top {chartData.length}</span>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 44)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="batches" fill="#15803d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Factories table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Factories</h2>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">No factories yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 w-10">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Factory</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Batches</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Success rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => {
                  const rate = successRate(r.passed_count, r.failed_count);
                  return (
                    <tr key={r.factory_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-400">{i + 1}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{r.factory_name}</td>
                      <td className="px-6 py-4 text-gray-600">{r.created_at.slice(0, 10)}</td>
                      <td className="px-6 py-4 text-gray-600">{r.users_count}</td>
                      <td className="px-6 py-4 text-gray-600">{r.products_count}</td>
                      <td className="px-6 py-4 text-gray-600">{r.batches_count}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {rate != null ? `${rate}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}