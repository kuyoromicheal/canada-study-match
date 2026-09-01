import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, validateSupabaseAnonKey } from "@/lib/supabase/env";

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase.from("users").select("role").eq("id", userId).single();
  return data?.role ?? null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const env = getSupabaseEnv();
  if (!env || validateSupabaseAnonKey(env.anonKey)) {
    if (
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/api/admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    if (!user) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    const role = await getUserRole(supabase, user.id);
    if (role !== "admin") {
      if (isAdminApi) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      return NextResponse.redirect(redirectUrl);
    }
  }

  const protectedPaths = ["/dashboard", "/onboarding", "/applications", "/profile", "/plan", "/gmail", "/cv", "/outreach", "/supervisors"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
