// Place at: app/components/AuthLayout.tsx
//
// Shared by /login and /signup so both look the same and stay in sync with
// the rest of the app (same dark green as the sidebar, same green buttons).

"use client";

import { useId } from "react";
import { Package, FlaskConical, FileText, Loader2, AlertTriangle } from "lucide-react";

const FEATURES = [
  { icon: Package, text: "Track raw materials and expiry dates" },
  { icon: FlaskConical, text: "Run AI-assisted quality checks on every batch" },
  { icon: FileText, text: "Export a certificate for any tested batch" },
];

const EXAMPLE_STAGES = [
  { label: "Intake", color: "bg-green-500" },
  { label: "Production", color: "bg-green-500" },
  { label: "Testing", color: "bg-amber-400" },
  { label: "Release", color: "bg-white/15" },
];

const EXAMPLE_READINGS = [
  { label: "pH", value: "4.1" },
  { label: "Moisture", value: "14%" },
  { label: "Score", value: "94" },
];

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-green-700 flex items-center justify-center text-white font-bold">
        A
      </div>
      <div>
        <div className={`font-semibold text-[17px] leading-tight ${dark ? "text-white" : "text-gray-900"}`}>
          AgriProcess
        </div>
        <div className="text-xs text-gray-400">Quality &amp; batch control</div>
      </div>
    </div>
  );
}

export default function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] font-sans">
      {/* Brand panel — hidden on small screens, where the form gets its own small header */}
      <aside className="relative hidden lg:flex flex-col bg-[#0E2A20] text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(21,128,61,0.28), transparent 55%)",
          }}
        />

        <div className="relative">
          <Brand dark />
        </div>

        <div className="relative my-auto max-w-md py-10">
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1]">
            Every batch accounted for, from intake to release.
          </h2>

          <ul className="mt-8 space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[14.5px] text-gray-300">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-green-400" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          {/* Illustrative sample only — not real data */}
          <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-wide text-gray-400">
                EXAMPLE BATCH
              </span>
              <span className="text-[11px] rounded-full bg-amber-400/15 text-amber-300 px-2 py-0.5">
                Testing
              </span>
            </div>
            <p className="mt-1 text-[15px] font-semibold">Tomato paste 830 g</p>

            <div className="mt-4 grid grid-cols-4 gap-1.5">
              {EXAMPLE_STAGES.map((s) => (
                <div key={s.label}>
                  <div className={`h-1 rounded-full ${s.color}`} />
                  <p className="mt-1.5 text-[10.5px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              {EXAMPLE_READINGS.map((r) => (
                <div key={r.label}>
                  <p className="text-[11px] text-gray-400">{r.label}</p>
                  <p className="font-mono text-lg font-semibold text-green-300">{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative text-xs text-gray-500">
          Built for small and mid-size food factories.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
        </div>
      </main>
    </div>
  );
}

// ---------- Reusable pieces ----------

export function AuthField({
  label,
  icon,
  trailing,
  hint,
  ...inputProps
}: {
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </span>
        <input
          id={id}
          {...inputProps}
          className={`w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 ${
            trailing ? "pr-11" : "pr-3"
          } text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-4 focus:ring-green-600/10`}
        />
        {trailing && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function AuthSubmit({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-700 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {loading ? loadingText : children}
    </button>
  );
}