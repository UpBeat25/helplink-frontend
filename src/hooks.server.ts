import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { pb } from "$lib/pocketbase";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.pb = pb;

  // Load cookie into PocketBase
  pb.authStore.loadFromCookie(event.request.headers.get("cookie") || "");

  // Try refresh session
  if (pb.authStore.isValid) {
    try {
      await pb.collection("users").authRefresh();
    } catch {
      pb.authStore.clear();
    }
  }

  // Set user in locals
  event.locals.user_xyz = pb.authStore.record;

  const isLoggedIn = !!pb.authStore.record;
  const path = event.url.pathname;

  // PUBLIC routes
  const pub = ["/", "/login", "/signup"];

  const isPublic = pub.some((p) => path.startsWith(p));

  // 🔥 1. If NOT logged in and NOT accessing public routes → redirect to login with redirect param
  if (!isLoggedIn && !isPublic) {
    const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
    throw redirect(303, `/login?redirectTo=${redirectTo}`);
  }

  // 🔥 2. If logged in and accessing login/signup → redirect to home (or whatever)
  if (isLoggedIn && (path === "/login" || path === "/signup")) {
    throw redirect(303, "/home");
  }

  // Continue request
  const response = await resolve(event);

  // Write updated cookie
  response.headers.set("set-cookie", pb.authStore.exportToCookie());

  return response;
};