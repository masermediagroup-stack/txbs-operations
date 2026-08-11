import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseEnvironment, hasSupabaseEnvironment, shouldBypassAuthentication } from "@/lib/supabase/env"

export async function updateSession(request: NextRequest) {
  if (shouldBypassAuthentication()) return NextResponse.next({ request })
  if (!hasSupabaseEnvironment()) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const { url, publishableKey } = getSupabaseEnvironment()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const isPublicRoute = request.nextUrl.pathname === "/login"

  if (!data?.claims && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (data?.claims && isPublicRoute) {
    const destination = request.nextUrl.clone()
    destination.pathname = "/"
    destination.search = ""
    return NextResponse.redirect(destination)
  }

  response.headers.set("Cache-Control", "private, no-store")
  return response
}
