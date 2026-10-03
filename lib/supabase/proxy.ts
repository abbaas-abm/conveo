import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, AUTH_COOKIE_MAX_AGE } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = ["/user", "/onboarding"];
const AUTH_ROUTES = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, key } = getSupabaseEnv();

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookieOptions: { maxAge: AUTH_COOKIE_MAX_AGE },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Invalid/expired refresh token (e.g. stale cookie). Clear the auth
    // cookies so the client stops retrying with a dead token.
    request.cookies
      .getAll()
      .filter((cookie) => cookie.name.startsWith("sb-"))
      .forEach((cookie) => response.cookies.delete(cookie.name));
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isAdminArea = path === "/admin" || path.startsWith("/admin/");
  const isVolunteerArea =
    path === "/volunteer" || path.startsWith("/volunteer/");
  const isUserArea = path === "/user" || path.startsWith("/user/");
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (!user && (isProtected || isAdminArea || isVolunteerArea)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    (isAdminArea ||
      isVolunteerArea ||
      isUserArea ||
      AUTH_ROUTES.includes(path))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding, role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const isVolunteer = profile?.role === "volunteer";
    const onboarded = profile?.onboarding === "DONE";

    if (isAdminArea && !isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = onboarded ? "/user" : "/onboarding";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    // Admins have their own dashboard and must not use the user dashboard.
    if (isUserArea && isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (isVolunteerArea && !isVolunteer) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = isAdmin
        ? "/admin"
        : onboarded
          ? "/user"
          : "/onboarding";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (AUTH_ROUTES.includes(path)) {
      const redirectUrl = request.nextUrl.clone();
      if (!onboarded) {
        redirectUrl.pathname = "/onboarding";
      } else if (isAdmin) {
        redirectUrl.pathname = "/admin";
      } else {
        redirectUrl.pathname = "/user";
      }
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
