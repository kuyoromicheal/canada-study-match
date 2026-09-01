"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { GraduationCap } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured on this deployment.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Unable to connect to Supabase.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("invalid api key")) {
        setError(
          "Invalid API key — fix NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel and redeploy without build cache."
        );
      } else {
        setError(error.message);
      }
    } else {
      router.push("/login?message=confirm_email");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <GraduationCap className="h-10 w-10 text-red-700 mx-auto mb-2" />
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start matching to Canadian programs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured() && (
            <Alert variant="warning" title="Setup required">
              Supabase environment variables are missing. Account creation requires a configured deployment.
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-red-700 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
