// Place at: app/page.tsx  (replaces the default Next.js starter page)
//
// "/" has no content of its own. It just sends people where they belong:
// signed in -> /dashboard, not signed in -> /login.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      // replace (not push), so the Back button doesn't bounce you back to "/"
      router.replace(user ? "/dashboard" : "/login");
    });
  }, [router]);

  return <p className="p-10 text-gray-500">Loading...</p>;
}