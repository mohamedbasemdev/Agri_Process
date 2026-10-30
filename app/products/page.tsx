"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "../components/appShell";
import { Pencil, Trash } from "lucide-react";

type Products = {
  id: string;
  name: string;
  category: string | null;
  shelf_life_months: number | null;
};

export default function ProductsPage() {
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Products[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [nameUpdate, setNameUpdate] = useState("");
  const [categoryUpdate, setCategoryUpdate] = useState("");
  const [shelfLifeUpdate, setShelfLifeUpdate] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
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

    const { data: factory } = await supabase
      .from("factory_users")
      .select("factory_id")
      .eq("user_id", user.id)
      .single();
    setFactoryId(factory?.factory_id);

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, category, shelf_life_months")
      .order("created_at", { ascending: false });
    setProducts(productsData ?? []);

    setLoading(false);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Read ?highlight=<id> from the URL (set by the search bar)
    const id = new URLSearchParams(window.location.search).get("highlight");
    if (id) setHighlightId(id);
  }, []);

  // Once the rows are on screen, scroll to the highlighted one, then
  // fade the highlight out after 3 seconds.
  useEffect(() => {
    if (!highlightId || products.length === 0) return;
    document.getElementById(`row-${highlightId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    const timer = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(timer);
  }, [highlightId, products]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!factoryId) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("products").insert({
      factory_id: factoryId,
      name,
      category: category || null,
      shelf_life_months: shelfLife ? Number(shelfLife) : null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setName("");
    setCategory("");
    setShelfLife("");
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEdit(id: any) {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("products")
      .update({
        factory_id: factoryId,
        name: nameUpdate,
        category: categoryUpdate || null,
        shelf_life_months: shelfLifeUpdate ? Number(shelfLifeUpdate) : null,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setNameUpdate("");
    setCategoryUpdate("");
    setShelfLifeUpdate("");
    setSaving(false);
    setOpen(false);
    load();
  }

  if (loading)
        return (
          <AppShell active="products" title="products" subtitle="Certificates you can download and hand over">
            <p className="text-gray-500">Loading...</p>
          </AppShell>
        );

  return (
    <AppShell
      active="products"
      title="Products"
      subtitle="What this factory makes"
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
                    Edit product
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update the product details, then save.
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
                  if (!selectedProductId) return;
                  handleEdit(selectedProductId);
                }}
                className="space-y-5 p-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Product name
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
                    Category
                  </label>
                  <input
                    type="text"
                    value={categoryUpdate}
                    onChange={(e) => setCategoryUpdate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Shelf life
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={shelfLifeUpdate}
                      onChange={(e) => setShelfLifeUpdate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-16 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      months
                    </span>
                  </div>
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

        <h1 className="text-2xl font-bold mb-6">Products</h1>

        <form
          onSubmit={handleAdd}
          className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Product name
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
                Category
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Shelf life (months)
              </label>
              <input
                type="number"
                value={shelfLife}
                onChange={(e) => setShelfLife(e.target.value)}
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
            {saving ? "Adding..." : "Add product"}
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <p className="text-base font-semibold text-gray-700">
                No products yet
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Add your first product above.
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 w-10">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500">
                      Shelf life
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {products.map((p, i) => (
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
                        {p.category ? (
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                            {p.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-left">
                        {p.shelf_life_months ? (
                          <span className="font-medium text-gray-600">
                            {p.shelf_life_months}
                            <span className="ml-1 text-xs text-gray-400">
                              months
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
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
                              setSelectedProductId(p.id);
                              setOpen(true);
                              setNameUpdate(p.name);
                              setCategoryUpdate(p.category ?? "");
                              setShelfLifeUpdate(
                                p.shelf_life_months
                                  ? String(p.shelf_life_months)
                                  : ""
                              );
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
