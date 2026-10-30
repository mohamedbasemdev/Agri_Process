"use client";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "../components/appShell";
import { Pencil, Trash } from "lucide-react";

type Materials = {
  id: string;
  name: string;
  supplier: string;
  quantity_kg: string;
  received_date: string;
  expiry_date: string;
};

export default function RawMaterials() {
  const [open, setOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null
  );
  const [rawMaterials, setRawMaterials] = useState<Materials[] | []>([]);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantitykg, setQuantitykg] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [nameUpdate, setNameUpdate] = useState("");
  const [supplierUpdate, setSupplierUpdate] = useState("");
  const [quantitykgUpdate, setQuantitykgUpdate] = useState("");
  const [receivedDateUpdate, setReceivedDateUpdate] = useState("");
  const [expiryDateUpdate, setExpiryDateUpdate] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

    const { data } = await supabase
      .from("factory_users")
      .select("factory_id")
      .eq("user_id", user.id)
      .single();
    setFactoryId(data?.factory_id);

    const { data: materialsData } = await supabase
      .from("raw_materials")
      .select("id, name, supplier, quantity_kg, received_date, expiry_date")
      .order("created_at", { ascending: false });
    setRawMaterials(materialsData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = new URLSearchParams(window.location.search).get("highlight");
    if (id) setHighlightId(id);
  }, []);

  useEffect(() => {
    if (!highlightId || rawMaterials.length === 0) return;
    document.getElementById(`row-${highlightId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightId, rawMaterials]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!factoryId) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("raw_materials").insert({
      factory_id: factoryId,
      name,
      supplier,
      quantity_kg: quantitykg,
      received_date: receivedDate,
      expiry_date: expiryDate,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setName("");
    setSupplier("");
    setQuantitykg("");
    setReceivedDate("");
    setExpiryDate("");
    setSaving(false);
    load();
  }

  async function handleEdit(id: string) {
    setSaving(true);
    setError(null);

    const { error: editError } = await supabase
      .from("raw_materials")
      .update({
        name: nameUpdate,
        supplier: supplierUpdate,
        quantity_kg: quantitykgUpdate,
        received_date: receivedDateUpdate,
        expiry_date: expiryDateUpdate,
      })
      .eq("id", id);

    if (editError) {
      setError(editError.message);
      setSaving(false);
      return;
    }

    setNameUpdate("");
    setSupplierUpdate("");
    setQuantitykgUpdate("");
    setReceivedDateUpdate("");
    setExpiryDateUpdate("");
    setSaving(false);
    setOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("raw_materials").delete().eq("id", id);
    load();
  }

  if (loading)
  return (
    <AppShell active="rawMaterials" title="rawMaterials" subtitle="Certificates you can download and hand over">
      <p className="text-gray-500">Loading...</p>
    </AppShell>
  );

  return (
    <AppShell
      active="rawMaterials"
      title="Raw Materials"
      subtitle="Stock, suppliers and expiry dates"
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
                    Edit material
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update the material details, then save.
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
                  if (!selectedMaterialId) return;
                  handleEdit(selectedMaterialId);
                }}
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Material name
                  </label>
                  <input
                    type="text"
                    value={nameUpdate}
                    onChange={(e) => setNameUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Supplier
                  </label>
                  <input
                    type="text"
                    value={supplierUpdate}
                    onChange={(e) => setSupplierUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    value={quantitykgUpdate}
                    onChange={(e) => setQuantitykgUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Received date
                  </label>
                  <input
                    type="date"
                    value={receivedDateUpdate}
                    onChange={(e) => setReceivedDateUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Expiry date
                  </label>
                  <input
                    type="date"
                    value={expiryDateUpdate}
                    onChange={(e) => setExpiryDateUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
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

        <h1 className="text-2xl font-bold mb-6">Raw Materials</h1>

        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Material name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Supplier
              </label>
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Quantity (kg)
              </label>
              <input
                type="number"
                value={quantitykg}
                onChange={(e) => setQuantitykg(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Received date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Expiry date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
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
            {saving ? "Adding..." : "Add material"}
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-gray-500 text-sm">Loading...</p>
          ) : rawMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <p className="text-base font-semibold text-gray-700">
                No materials yet
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Add your first material above.
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 w-10">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Received date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Expiry date
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rawMaterials.map((p, i) => (
                    <tr
  key={p.id}
  id={`row-${p.id}`}
  className={`group transition-colors duration-500 hover:bg-gray-50 ${
    highlightId === p.id ? "bg-green-100" : ""
  }`}
>
                      <td className="px-6 py-4 text-left text-gray-400">
                        {i + 1}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <p className="font-semibold text-gray-800">{p.name}</p>
                      </td>

                      <td className="px-6 py-4 text-left">
                        {p.supplier ? (
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            {p.supplier}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-left">
                        {p.quantity_kg ? (
                          <span className="font-medium text-gray-600">
                            {p.quantity_kg}
                            <span className="ml-1 text-xs text-gray-400">
                              kg
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-left">
                        {p.received_date ? (
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            {p.received_date}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-left">
                        {p.expiry_date ? (
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            {p.expiry_date}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash className="w-5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedMaterialId(p.id);
                              setOpen(true);
                              setNameUpdate(p.name);
                              setSupplierUpdate(p.supplier ?? "");
                              setQuantitykgUpdate(p.quantity_kg ?? "");
                              setReceivedDateUpdate(p.received_date ?? "");
                              setExpiryDateUpdate(p.expiry_date ?? "");
                            }}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
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
