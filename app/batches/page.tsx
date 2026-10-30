"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "../components/appShell";
import { Pencil, Trash, CheckCircle2 } from "lucide-react";

type Status = "pending" | "testing" | "passed" | "failed" | "completed";

type Batch = {
  id: string;
  quantity_kg: string | null;
  production_date: string | null;
  cost: number | null;
  status: Status;
  products: { name: string } | null;
  raw_materials: { name: string } | null;
};

type Option = {
  id: string;
  name: string;
};

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700",
  testing: "bg-slate-100 text-slate-600",
  passed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  completed: "bg-blue-50 text-blue-700",
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [factoryId, setFactoryId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // add form
  const [product, setProduct] = useState("");
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [cost, setCost] = useState("");

  // edit modal
  const [open, setOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [productUpdate, setProductUpdate] = useState("");
  const [materialUpdate, setMaterialUpdate] = useState("");
  const [quantityUpdate, setQuantityUpdate] = useState("");
  const [productionDateUpdate, setProductionDateUpdate] = useState("");
  const [costUpdate, setCostUpdate] = useState("");

  const supabase = createClient();
  const router = useRouter();

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

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name");
    setProducts(productsData ?? []);

    const { data: materialsData } = await supabase
      .from("raw_materials")
      .select("id, name");
    setMaterials(materialsData ?? []);

    // Join: pull the related product/material name in the same query
    const { data: batchesData, error: batchesError } = await supabase
      .from("batches")
      .select(
        `id, quantity_kg, production_date, cost, status,
         products ( name ),
         raw_materials ( name )`
      )
      .order("created_at", { ascending: false });

    if (batchesError) {
      setError(batchesError.message);
    } else {
      setBatches((batchesData as unknown as Batch[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!factoryId || !product) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("batches").insert({
      factory_id: factoryId,
      product_id: product,
      raw_material_id: material || null,
      quantity_kg: quantity || null,
      production_date: productionDate || null,
      cost: cost ? Number(cost) : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setProduct("");
    setMaterial("");
    setQuantity("");
    setProductionDate("");
    setCost("");
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("batches").delete().eq("id", id);
    load();
  }

  async function handleComplete(id: string) {
    setError(null);
    const { error: completeError } = await supabase
      .from("batches")
      .update({ status: "completed" })
      .eq("id", id);

    if (completeError) {
      setError("Couldn't mark as completed: " + completeError.message);
      return;
    }
    load();
  }

  async function handleEdit(id: string) {
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      quantity_kg: quantityUpdate || null,
      production_date: productionDateUpdate || null,
      cost: costUpdate ? Number(costUpdate) : null,
    };
    if (productUpdate) payload.product_id = productUpdate;
    if (materialUpdate) payload.raw_material_id = materialUpdate;

    const { error: updateError } = await supabase
      .from("batches")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    load();
  }

  if (loading)
            return (
              <AppShell active="batches" title="batches" subtitle="Certificates you can download and hand over">
                <p className="text-gray-500">Loading...</p>
              </AppShell>
            );

  return (
    <AppShell
      active="batches"
      title="Batches"
      subtitle="Every batch from intake to release"
    >
      <div className="max-w-3.5xl">
        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Edit batch
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update the batch details, then save.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedBatchId) return;
                  handleEdit(selectedBatchId);
                }}
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Product (leave blank to keep current)
                  </label>
                  <select
                    value={productUpdate}
                    onChange={(e) => setProductUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">— keep current —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Raw material (leave blank to keep current)
                  </label>
                  <select
                    value={materialUpdate}
                    onChange={(e) => setMaterialUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">— keep current —</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={quantityUpdate}
                    onChange={(e) => setQuantityUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Production date
                  </label>
                  <input
                    type="date"
                    value={productionDateUpdate}
                    onChange={(e) => setProductionDateUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    value={costUpdate}
                    onChange={(e) => setCostUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      selectedBatchId
                        ? STATUS_STYLES[
                            batches.find((b) => b.id === selectedBatchId)
                              ?.status ?? "pending"
                          ]
                        : ""
                    }`}
                  >
                    {batches.find((b) => b.id === selectedBatchId)?.status}
                  </span>
                  <p className="mt-2 text-xs text-gray-400">
                    Status can only change by running a quality check in the
                    Quality Lab — it isn&apos;t editable here.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6">Batches</h1>

        {products.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
            You haven&apos;t added any products yet. Add one in{" "}
            <a href="/products" className="underline font-medium">
              Products
            </a>{" "}
            before you can start a batch.
          </div>
        )}

        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Product
              </label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600 bg-white"
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Raw material source
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600 bg-white"
              >
                <option value="">None</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Quantity (kg)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Production date
              </label>
              <input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Cost ($)
              </label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-green-700 text-white px-4 py-2 rounded-md font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? "Starting..." : "Start batch"}
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">Loading...</p>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <p className="text-base font-semibold text-gray-700">
                No batches yet
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Start your first batch above.
              </p>
            </div>
          ) : (
            <div className="h-[400px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr>
                     <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 w-10">
                    #
                  </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Material
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Cost
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 w-px whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 w-px whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.map((b, i) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-left text-gray-400">{i + 1}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {b.products?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {b.raw_materials?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {b.quantity_kg ? `${b.quantity_kg} kg` : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {b.cost != null ? `$${b.cost}` : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            STATUS_STYLES[b.status]
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-start gap-2">
                          {b.status === "passed" && (
                            <button
                              onClick={() => handleComplete(b.id)}
                              className="rounded-lg cursor-pointer py-2 text-sm font-medium text-blue-700 bg-blue-50 transition hover:bg-blue-100"
                            >
                              <CheckCircle2 className="w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="rounded-lg cursor-pointer text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash className="w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBatchId(b.id);
                              setOpen(true);
                              setProductUpdate("");
                              setMaterialUpdate("");
                              setQuantityUpdate(b.quantity_kg ?? "");
                              setProductionDateUpdate(b.production_date ?? "");
                              setCostUpdate(
                                b.cost != null ? String(b.cost) : ""
                              );
                            }}
                            className="rounded-lg cursor-pointer py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil className="w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
