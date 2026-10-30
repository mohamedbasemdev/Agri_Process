"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "../components/appShell";

type Limits = {
  min_ph: number | null;
  max_ph: number | null;
  min_temperature: number | null;
  max_temperature: number | null;
  min_moisture: number | null;
  max_moisture: number | null;
};

type BatchOption = {
  id: string;
  status: string;
  product_id: string;
  products: ({ name: string } & Limits) | null;
};

type CheckResult = {
  score: number;
  result: "passed" | "failed";
  notes: string;
};

export default function QualityLabPage() {
  const supabase = createClient();
  const router = useRouter();

  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [batchId, setBatchId] = useState("");
  const [ph, setPh] = useState("");
  const [temperature, setTemperature] = useState("");
  const [moisture, setMoisture] = useState("");

  // limits state — either loaded from the product, or a fresh AI suggestion
  const [limits, setLimits] = useState<Limits | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const supabaseClient = supabase; // alias, avoids re-creating client below

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: factory } = await supabase
      .from("factory_users")
      .select("factory_id")
      .eq("user_id", user.id)
      .maybeSingle();
    setFactoryId(factory?.factory_id ?? null);

    const { data: batchesData } = await supabase
      .from("batches")
      .select(
        `id, status, product_id,
         products!batches_product_id_fkey (
           name, min_ph, max_ph, min_temperature, max_temperature, min_moisture, max_moisture
         )`
      )
      .in("status", ["pending", "testing"])
      .order("created_at", { ascending: false });

    setBatches((batchesData as unknown as BatchOption[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const selectedBatch = batches.find((b) => b.id === batchId) ?? null;
  const productName = selectedBatch?.products?.name ?? "";

  // whenever the selected batch changes, load its existing limits (if any)
  function handleSelectBatch(id: string) {
    setBatchId(id);
    setResult(null);
    setError(null);

    const b = batches.find((x) => x.id === id);
    if (!b?.products) {
      setLimits(null);
      return;
    }

    const p = b.products;
    const hasLimits =
      p.min_ph != null &&
      p.max_ph != null &&
      p.min_temperature != null &&
      p.max_temperature != null &&
      p.min_moisture != null &&
      p.max_moisture != null;

    setLimits(
      hasLimits
        ? {
            min_ph: p.min_ph,
            max_ph: p.max_ph,
            min_temperature: p.min_temperature,
            max_temperature: p.max_temperature,
            min_moisture: p.min_moisture,
            max_moisture: p.max_moisture,
          }
        : null
    );
  }

  async function handleSuggestLimits() {
    if (!productName) return;
    setSuggesting(true);
    setError(null);

    try {
      const res = await fetch("/api/suggest-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Couldn't get a suggestion");
        setSuggesting(false);
        return;
      }

      setLimits({
        min_ph: data.min_ph,
        max_ph: data.max_ph,
        min_temperature: data.min_temperature,
        max_temperature: data.max_temperature,
        min_moisture: data.min_moisture,
        max_moisture: data.max_moisture,
      });
    } catch {
      setError("Something went wrong reaching the AI service.");
    }
    setSuggesting(false);
  }

  async function handleSaveLimits() {
    if (!limits || !selectedBatch) return;
    setSavingLimits(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("products")
      .update(limits)
      .eq("id", selectedBatch.product_id);

    if (updateError) {
      setError("Couldn't save limits: " + updateError.message);
      setSavingLimits(false);
      return;
    }

    setSavingLimits(false);
    load(); // refresh so this product now shows as having saved limits
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!batchId || !factoryId || !limits) return;

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/quality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ph: Number(ph),
          temperature: Number(temperature),
          moisture: Number(moisture),
          productName,
          minPh: limits.min_ph,
          maxPh: limits.max_ph,
          minTemperature: limits.min_temperature,
          maxTemperature: limits.max_temperature,
          minMoisture: limits.min_moisture,
          maxMoisture: limits.max_moisture,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI evaluation failed");
        setChecking(false);
        return;
      }

      const aiResult = data as CheckResult;
      setResult(aiResult);

      const { error: insertError } = await supabase.from("quality_checks").insert({
        factory_id: factoryId,
        batch_id: batchId,
        ph: Number(ph),
        temperature: Number(temperature),
        moisture: Number(moisture),
        score: aiResult.score,
        result: aiResult.result,
        notes: aiResult.notes,
      });

      if (insertError) {
        setError("Result computed, but we couldn't save it: " + insertError.message);
        setChecking(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("batches")
        .update({ status: aiResult.result })
        .eq("id", batchId);

      if (updateError) {
        setError("Result saved, but the batch status wasn't updated: " + updateError.message);
      }

      setChecking(false);
      setBatchId("");
      setPh("");
      setTemperature("");
      setMoisture("");
      setLimits(null);
      load();
    } catch {
      setError("Something went wrong reaching the AI service.");
      setChecking(false);
    }
  }

  const limitsConfirmed =
    limits != null &&
    selectedBatch?.products &&
    selectedBatch.products.min_ph === limits.min_ph &&
    selectedBatch.products.max_ph === limits.max_ph &&
    selectedBatch.products.min_temperature === limits.min_temperature &&
    selectedBatch.products.max_temperature === limits.max_temperature &&
    selectedBatch.products.min_moisture === limits.min_moisture &&
    selectedBatch.products.max_moisture === limits.max_moisture;

    
      if (loading)
      return (
        <AppShell active="qualityLab" title="qualityLab" subtitle="Certificates you can download and hand over">
          <p className="text-gray-500">Loading...</p>
        </AppShell>
      );

  return (
    <AppShell active="qualityLab" title="Quality Lab" subtitle="Record readings and get a verdict on the batch">
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Quality Lab</h1>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {/* Batch + readings */}
          <form
            onSubmit={handleCheck}
            className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
          >
            <div>
              <label className="block text-sm text-gray-600 mb-1">Batch</label>
              {loading ? (
                <p className="text-sm text-gray-400">Loading batches...</p>
              ) : batches.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No batches waiting for a quality check right now.
                </p>
              ) : (
                <select
                  value={batchId}
                  onChange={(e) => handleSelectBatch(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600 bg-white"
                >
                  <option value="">Select a batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.products?.name ?? "Unknown product"} — {b.status}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">pH</label>
                <input
                  type="number"
                  step="0.1"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Temp (°C)</label>
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Moisture (%)</label>
                <input
                  type="number"
                  value={moisture}
                  onChange={(e) => setMoisture(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={checking || !batchId || !limitsConfirmed}
              className="bg-green-700 text-white px-4 py-2 rounded-md font-medium hover:bg-green-800 disabled:opacity-50"
            >
              {checking ? "Running check..." : "Run quality check"}
            </button>
            {batchId && !limitsConfirmed && (
              <p className="text-xs text-amber-600">
                {ph && temperature && moisture
                  ? "Confirm quality limits below before running the check."
                  : "Enter pH, temperature and moisture to continue."}
              </p>
            )}
          </form>

          {/* Limits panel — only shown once a batch is picked AND all readings are entered */}
          {batchId && ph && temperature && moisture && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Quality limits for {productName || "this product"}
              </h3>

              {!limits ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    No quality limits set for this product yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleSuggestLimits}
                    disabled={suggesting}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {suggesting ? "Asking AI..." : "Suggest limits with AI"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={limits.min_ph ?? ""}
                        onChange={(e) =>
                          setLimits({ ...limits, min_ph: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={limits.max_ph ?? ""}
                        onChange={(e) =>
                          setLimits({ ...limits, max_ph: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Temp (°C)</label>
                      <input
                        type="number"
                        value={limits.min_temperature ?? ""}
                        onChange={(e) =>
                          setLimits({ ...limits, min_temperature: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Temp (°C)</label>
                      <input
                        type="number"
                        value={limits.max_temperature ?? ""}
                        onChange={(e) =>
                          setLimits({ ...limits, max_temperature: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Min Moisture (%)</label>
                      <input
                        type="number"
                        value={limits.min_moisture ?? ""}
                        onChange={(e) =>
                          setLimits({ ...limits, min_moisture: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Max Moisture (%)</label>
                      <input
                        type="number"
                        value={limits.max_moisture ?? ""}
                        onChange={(e) =>
                          setLimits({ ...limits, max_moisture: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  {limitsConfirmed ? (
                    <p className="text-xs text-green-700">✓ Saved for this product.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveLimits}
                      disabled={savingLimits}
                      className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                    >
                      {savingLimits ? "Saving..." : "Confirm & save limits"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Result card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {!result ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-base font-semibold text-gray-700">No result yet</p>
              <p className="mt-1 text-sm text-gray-400 max-w-[26ch]">
                Fill in the readings, confirm the limits, and run the check to see a
                score and a verdict here.
              </p>
            </div>
          ) : (
            <div>
              <div
                className={`px-6 py-4 text-white ${
                  result.result === "passed" ? "bg-green-700" : "bg-red-700"
                }`}
              >
                <p className="text-xs opacity-80">Quality result</p>
                <h2 className="text-lg font-bold capitalize">{result.result}</h2>
              </div>
              <div className="p-6 flex items-center gap-6">
                <div className="text-5xl font-bold text-gray-800">{result.score}</div>
                <div className="text-sm text-gray-500">out of 100</div>
              </div>
              <div className="px-6 pb-6">
                <p className="text-sm text-gray-600">{result.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </AppShell>
  );
}