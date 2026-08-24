import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// UploadThing API routes must be public for callbacks to work
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/electron-auth(.*)",
  "/api/uploadthing(.*)",
]);
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

// Next.js 16+: use `proxy.ts` only (do not add `middleware.ts` — both files conflict).
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};