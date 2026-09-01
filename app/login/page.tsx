"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, getAuthConfigError, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { GraduationCap } from "lucide-react";

function authCallbackMessage(code: string | null): string | null {
  if (code === "email_confirmation_failed") {
    return "Email confirmation failed. Try signing in, or sign up again.";
  }
  if (code === "supabase_not_configured") {
    return "Supabase is not configured on this deployment.";
  }
  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setConfigError(getAuthConfigError());
    const callbackError = authCallbackMessage(searchParams.get("error"));
    if (callbackError) setError(callbackError);
    if (searchParams.get("message") === "confirm_email") {
      setInfo("Account created — check your email to confirm, then sign in here.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const configErr = getAuthConfigError();
    if (configErr) {
      setConfigError(configErr);
      setError(configErr);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured on this deployment.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Unable to connect to Supabase. Check your anon key and redeploy.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes("invalid api key")) {
        setError(
          "Invalid API key — the anon key on this deployment is wrong or an old build is cached. " +
            "Update NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy without build cache."
        );
      } else {
        setError(signInError.message);
      }
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email for magic link.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Unable to connect to Supabase.");
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    setLoading(false);

    if (otpError) setError(otpError.message);
    else setMagicLinkSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <GraduationCap className="h-10 w-10 text-red-700 mx-auto mb-2" />
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to Canada Study Match</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info && (
            <Alert variant="info" title="Confirm your email">
              {info}
            </Alert>
          )}

          {configError && (
            <Alert variant="warning" title="Configuration error">
              {configError}
            </Alert>
          )}

          {magicLinkSent ? (
            <Alert variant="success" title="Check your email">
              We sent a magic link to {email}.
            </Alert>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error && <Alert variant="error" title="Sign in failed">{error}</Alert>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleMagicLink} disabled={loading}>
                Send magic link
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500">
            No account?{" "}
            <Link href="/signup" className="text-red-700 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
