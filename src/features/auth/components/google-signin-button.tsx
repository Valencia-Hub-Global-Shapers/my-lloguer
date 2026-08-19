"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next, label }: { next: string; label: string }) {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <Button onClick={signIn} disabled={loading} className="w-full" variant="outline">
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.9h5.35c-.5 2.4-2.55 3.9-5.35 3.9a6 6 0 1 1 0-12c1.5 0 2.9.55 3.95 1.45l2.2-2.2A9.9 9.9 0 1 0 12 22c5.7 0 9.5-4 9.5-9.65 0-.3-.05-.85-.15-1.25Z"
        />
      </svg>
      {label}
    </Button>
  );
}
