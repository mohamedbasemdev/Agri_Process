"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "../components/appShell";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";

type QualityCheck = {
  ph: number | null;
  temperature: number | null;
  moisture: number | null;
  score: number | null;
  result: string | null;
  notes: string | null;
  created_at: string;
};

type BatchOption = {
  id: string;
  status: string;
  quantity_kg: string | null;
  production_date: string | null;
  cost: number | null;
  products: { name: string } | null;
  quality_checks: QualityCheck[];
};

export default function ReportsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [factoryName, setFactoryName] = useState("");
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: factories } = await supabase.from("factories").select("name").limit(1);
      setFactoryName(factories?.[0]?.name ?? "Factory");

      // Only batches that actually have at least one quality check can
      // get a certificate — there's nothing honest to print otherwise.
      const { data: batchesData } = await supabase
        .from("batches")
        .select(
          `id, status, quantity_kg, production_date, cost,
           products ( name ),
           quality_checks ( ph, temperature, moisture, score, result, notes, created_at )`
        )
        .order("production_date", { ascending: false });

      const withChecks = ((batchesData as unknown as BatchOption[]) ?? []).filter(
        (b) => b.quality_checks && b.quality_checks.length > 0
      );
      setBatches(withChecks);
      setLoading(false);
    }
    load();
  }, []);

  const selected = batches.find((b) => b.id === batchId) ?? null;
  const latestCheck = selected?.quality_checks
    ? [...selected.quality_checks].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
    : null;

  function handleDownload() {
    if (!selected || !latestCheck) return;

    const doc = new jsPDF();
    const productName = selected.products?.name ?? "Unknown product";

    doc.setFontSize(16);
    doc.text("Batch Quality Certificate", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(factoryName, 14, 27);

    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(11);
    doc.setTextColor(20);
    const rows: [string, string][] = [
      ["Product", productName],
      ["Quantity", selected.quantity_kg ? `${selected.quantity_kg} kg` : "—"],
      ["Production date", selected.production_date ?? "—"],
      ["Cost", selected.cost != null ? `$${selected.cost}` : "—"],
      ["Status", selected.status],
      ["pH reading", String(latestCheck.ph ?? "—")],
      ["Temperature reading", `${latestCheck.temperature ?? "—"}°C`],
      ["Moisture reading", `${latestCheck.moisture ?? "—"}%`],
      ["Quality score", `${latestCheck.score ?? "—"} / 100`],
      ["Result", (latestCheck.result ?? "—").toUpperCase()],
    ];

    let y = 42;
    rows.forEach(([label, value]) => {
      doc.setTextColor(120);
      doc.text(label, 14, y);
      doc.setTextColor(20);
      doc.text(value, 80, y);
      y += 8;
    });

    if (latestCheck.notes) {
      y += 4;
      doc.setTextColor(120);
      doc.text("Notes", 14, y);
      y += 6;
      doc.setTextColor(20);
      const noteLines = doc.splitTextToSize(latestCheck.notes, 180);
      doc.text(noteLines, 14, y);
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated ${new Date().toLocaleString()} — AgriProcess`,
      14,
      285
    );

    doc.save(`certificate-${productName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  if (loading)
  return (
    <AppShell active="reports" title="Reports" subtitle="Certificates you can download and hand over">
      <p className="text-gray-500">Loading...</p>
    </AppShell>
  );

  return (
    <AppShell active="reports" title="Reports" subtitle="Certificates you can download and hand over">
      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <label className="block text-sm text-gray-600 mb-1">Batch</label>
          {batches.length === 0 ? (
            <p className="text-sm text-gray-400">
              No batches with a quality check yet. Run a check in{" "}
              <a href="/quality-lab" className="underline font-medium text-gray-600">
                Quality Lab
              </a>{" "}
              first.
            </p>
          ) : (
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600 bg-white"
            >
              <option value="">Select a batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.products?.name ?? "Unknown product"} — {b.production_date ?? "no date"} —{" "}
                  {b.status}
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && latestCheck && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div
              className={`px-6 py-4 ${
                latestCheck.result === "passed" ? "bg-green-700" : "bg-red-700"
              } text-white`}
            >
              <p className="text-xs opacity-80">Quality certificate preview</p>
              <h2 className="text-lg font-bold">{selected.products?.name}</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-gray-500">Quantity</span>
              <span>{selected.quantity_kg ? `${selected.quantity_kg} kg` : "—"}</span>
              <span className="text-gray-500">Production date</span>
              <span>{selected.production_date ?? "—"}</span>
              <span className="text-gray-500">Score</span>
              <span className="font-semibold">{latestCheck.score} / 100</span>
              <span className="text-gray-500">Result</span>
              <span className="font-semibold capitalize">{latestCheck.result}</span>
              <span className="text-gray-500">Notes</span>
              <span className="col-span-1">{latestCheck.notes}</span>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-md font-medium hover:bg-green-800"
              >
                <FileDown size={16} />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}