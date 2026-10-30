"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import {
  Factory,
  LogOut,
  Search,
  Bell,
  AlertTriangle,
  Clock,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

type NavKey =
  | "dashboard"
  | "batches"
  | "qualityLab"
  | "products"
  | "rawMaterials"
  | "reports"
  | "admin";

const REPORT_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "reports", label: "Reports", href: "/reports" },
];

// Ordered to match how a new factory actually works, not alphabetically:
// set up what you make and what you have (Catalogue) before you can
// start a batch or run a quality check (Operations).
const SETUP_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "products", label: "Products", href: "/products" },
  { key: "rawMaterials", label: "Raw Materials", href: "/rawMaterials" },
];

const OPERATIONS_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "batches", label: "Batches", href: "/batches" },
  { key: "qualityLab", label: "Quality Lab", href: "/qualityLab" },
];

// Only rendered for platform admins (see isAdmin below).
const ADMIN_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "admin", label: "Admin Console", href: "/admin" },
];

export default function AppShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: NavKey;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [factoryName, setFactoryName] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Two separate states on purpose, so Tailwind breakpoints (not JS) decide
  // which one matters. That avoids hydration mismatches from reading the
  // window width during render.
  //   desktopOpen: sidebar sits in the layout on md+ screens (default open)
  //   mobileOpen:  sidebar slides OVER the page on small screens (default closed)
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Remember the desktop choice across pages (each page mounts its own AppShell).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem("sidebar-open") === "false") setDesktopOpen(false);
  }, []);

  function toggleDesktop() {
    const next = !desktopOpen;
    setDesktopOpen(next);
    localStorage.setItem("sidebar-open", String(next));
  }
  const [failedAlerts, setFailedAlerts] = useState<string[]>([]);
  const [expiringAlerts, setExpiringAlerts] = useState<{ id: string; name: string; expiry_date: string }[]>(
    []
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; type: "Product" | "Raw material" }[]
  >([]);

  useEffect(() => {
    async function loadFactory() {
      const { data: factories } = await supabase.from("factories").select("name").limit(1);
      setFactoryName(factories?.[0]?.name ?? null);
    }

    // Real alerts, computed the same way as the dashboard — not mock copy.
    // Shown here too so they're reachable from any page, not just /dashboard.
    async function loadAlerts() {
      const { data: batchesData } = await supabase
        .from("batches")
        .select("status, products ( name )")
        .eq("status", "failed");
      setFailedAlerts(
        ((batchesData as unknown as { products: { name: string } | null }[]) ?? []).map(
          (b) => b.products?.name ?? "Unknown product"
        )
      );

      const { data: materialsData } = await supabase
        .from("raw_materials")
        .select("id, name, expiry_date");
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);
      const soon = (materialsData ?? []).filter((m) => {
        if (!m.expiry_date) return false;
        const exp = new Date(m.expiry_date);
        return exp >= today && exp <= in7Days;
      });
      setExpiringAlerts(soon as { id: string; name: string; expiry_date: string }[]);
    }

    // RLS only lets a user read their own platform_admins row, so a row
    // coming back means "I'm an admin". Only affects whether the link shows.
    async function loadAdminFlag() {
      const { data } = await supabase.from("platform_admins").select("user_id").maybeSingle();
      setIsAdmin(!!data);
    }

    loadFactory();
    loadAlerts();
    loadAdminFlag();
  }, []);

  const alertCount = failedAlerts.length + expiringAlerts.length;

  // Debounced search: waits 300ms after typing stops before querying,
  // so we don't send a request on every keystroke.
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const [{ data: products }, { data: materials }] = await Promise.all([
        supabase.from("products").select("id, name").ilike("name", `%${query}%`).limit(5),
        supabase.from("raw_materials").select("id, name").ilike("name", `%${query}%`).limit(5),
      ]);

      setSearchResults([
        ...(products ?? []).map((p) => ({ id: p.id, name: p.name, type: "Product" as const })),
        ...(materials ?? []).map((m) => ({ id: m.id, name: m.name, type: "Raw material" as const })),
      ]);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-[#EEF2EC] font-sans">
      {/* Dark backdrop behind the sidebar on mobile; tap it to close */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar
          < md : fixed overlay that slides in over the page (content doesn't move)
          >= md: sits in the layout, and can be collapsed with the topbar button */}
      <aside
        className={`bg-[#0E2A20] text-gray-300 flex flex-col p-3 w-[232px] shrink-0 h-screen max-h-dvh overflow-y-auto
          fixed top-0 left-0 z-40 transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:sticky md:translate-x-0 md:z-auto
          ${desktopOpen ? "" : "md:hidden"}`}
      >
        <div className="flex items-center gap-2 px-2 pt-2 pb-5">
          <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
          <div>
            <div className="text-white font-semibold text-[15px] leading-tight">
              AgriProcess
            </div>
            <div className="text-[11px] text-gray-400">Quality &amp; batch control</div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-gray-400 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 mb-4">
          <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
            <Factory size={15} className="text-gray-300" />
          </div>
          <div className="min-w-0">
            <div className="text-white text-[13px] font-medium truncate">
              {factoryName ?? "Loading..."}
            </div>
            <div className="text-[11px] text-gray-500">Your factory</div>
          </div>
        </div>

        <nav className="mb-3">
          <Link
            href="/dashboard"
            prefetch={false}
            className={`block px-3 py-2 rounded-md text-[13.5px] transition ${
              active === "dashboard"
                ? "bg-white/10 text-white font-medium"
                : "text-gray-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            Dashboard
          </Link>
        </nav>

        <div className="text-[10.5px] tracking-wide text-gray-500 px-2 pb-1">
          1 · SET UP
        </div>
        <nav className="flex flex-col gap-0.5 mb-3">
          {SETUP_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              className={`px-3 py-2 rounded-md text-[13.5px] transition ${
                active === item.key
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="text-[10.5px] tracking-wide text-gray-500 px-2 pb-1">
          2 · RUN PRODUCTION
        </div>
        <nav className="flex flex-col gap-0.5 mb-3">
          {OPERATIONS_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              className={`px-3 py-2 rounded-md text-[13.5px] transition ${
                active === item.key
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="text-[10.5px] tracking-wide text-gray-500 px-2 pb-1">INSIGHT</div>
        <nav className="flex flex-col gap-0.5">
          {REPORT_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              className={`px-3 py-2 rounded-md text-[13.5px] transition ${
                active === item.key
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {isAdmin && (
          <>
            <div className="text-[10.5px] tracking-wide text-gray-500 px-2 pb-1 mt-3">
              PLATFORM
            </div>
            <nav className="flex flex-col gap-0.5">
              {ADMIN_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={false}
                  className={`px-3 py-2 rounded-md text-[13.5px] transition ${
                    active === item.key
                      ? "bg-white/10 text-white font-medium"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </>
        )}

        <div className="mt-auto pt-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-md text-[13.5px] text-gray-300 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col min-w-0 flex-1">
        <header className="bg-white border-b border-gray-200 px-4 md:px-7 py-3.5 flex items-center gap-3 md:gap-4 sticky top-0 z-10">
          {/* Mobile: opens the overlay sidebar */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-[34px] h-[34px] rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>
          {/* Desktop: collapses / expands the sidebar */}
          <button
            onClick={toggleDesktop}
            className="hidden md:flex w-[34px] h-[34px] rounded-md border border-gray-200 items-center justify-center text-gray-500 hover:bg-gray-50"
            aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {desktopOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <div>
            <h1 className="text-[19px] font-semibold text-gray-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-[12.5px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden sm:block">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-64 focus-within:border-green-600 transition">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  placeholder="Search products or materials"
                  className="bg-transparent outline-none text-[13px] text-gray-700 placeholder:text-gray-400 w-full"
                />
              </div>

              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-3 text-[13px] text-gray-400">No results found.</p>
                  ) : (
                    searchResults.map((r) => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        href={
                          r.type === "Product"
                            ? `/products?highlight=${r.id}`
                            : `/raw-materials?highlight=${r.id}`
                        }
                        prefetch={false}
                        onClick={() => {
                          setSearchQuery("");
                          setSearchOpen(false);
                        }}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-[13px]"
                      >
                        <span className="text-gray-800 truncate">{r.name}</span>
                        <span className="text-[11px] text-gray-400 shrink-0 ml-2">{r.type}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setNotifOpen(true)}
              className="relative w-[34px] h-[34px] rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              <Bell size={16} />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
            <div className="w-[34px] h-[34px] rounded-md bg-green-700 text-white text-xs font-semibold flex items-center justify-center">
              U
            </div>
          </div>
        </header>

        <main className="p-4 md:p-7 max-w-6xl w-full">{children}</main>
      </div>

      {/* Notifications drawer */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setNotifOpen(false)}
        >
          <aside
            className="fixed top-0 right-0 bottom-0 w-[360px] max-w-[90vw] bg-white border-l border-gray-200 flex flex-col z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">Alerts</h2>
              <button
                onClick={() => setNotifOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {alertCount === 0 ? (
                <p className="text-sm text-gray-400 px-5 py-8 text-center">
                  Nothing needs attention right now.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {failedAlerts.map((name, i) => (
                    <div key={`f-${i}`} className="flex gap-3 px-5 py-3.5">
                      <div className="w-7 h-7 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle size={14} className="text-red-600" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-medium text-gray-800">
                          Quality check failed
                        </p>
                        <p className="text-[12.5px] text-gray-500 mt-0.5">
                          A batch of {name} didn&apos;t pass its quality check.
                        </p>
                      </div>
                    </div>
                  ))}
                  {expiringAlerts.map((m) => (
                    <div key={m.id} className="flex gap-3 px-5 py-3.5">
                      <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock size={14} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-medium text-gray-800">
                          Material expiring soon
                        </p>
                        <p className="text-[12.5px] text-gray-500 mt-0.5">
                          {m.name} expires on {m.expiry_date}.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}