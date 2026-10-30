// Place at: app/signup/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import AuthLayout, { AuthField, AuthError, AuthSubmit } from "../components/AuthLayout";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [factoryName, setFactoryName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Something went wrong creating your account");
      setLoading(false);
      return;
    }

    // We generate the id ourselves so we don't have to .select()
    // right after inserting — that would fail because the SELECT
    // policy can't show the new row until factory_users links it.
    const factoryId = crypto.randomUUID();

    const { error: factoryError } = await supabase
      .from("factories")
      .insert({ id: factoryId, name: factoryName });

    if (factoryError) {
      setError("Account created, but we couldn't create the factory: " + factoryError.message);
      setLoading(false);
      return;
    }

    const { error: linkError } = await supabase.from("factory_users").insert({
      user_id: authData.user.id,
      factory_id: factoryId,
      role: "owner",
    });

    if (linkError) {
      setError("We couldn't link your account to the factory: " + linkError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthLayout
      title="Create your factory account"
      subtitle="Set up your workspace, then add your products and raw materials."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-green-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <AuthField
          label="Factory name"
          icon={<Factory size={16} />}
          type="text"
          autoComplete="organization"
          placeholder="e.g. Nile Valley Foods"
          value={factoryName}
          onChange={(e) => setFactoryName(e.target.value)}
          required
        />

        <AuthField
          label="Email"
          icon={<Mail size={16} />}
          type="email"
          autoComplete="email"
          placeholder="you@factory.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthField
          label="Password"
          icon={<Lock size={16} />}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          hint="Use at least 6 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="p-2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        {error && <AuthError message={error} />}

        <AuthSubmit loading={loading} loadingText="Creating account...">
          Create account
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
}