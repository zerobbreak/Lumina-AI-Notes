import { applyAppearance } from "./apply";
import { APPEARANCE_COOKIE, DEFAULT_APPEARANCE } from "./model";

/**
 * Inline <head> script: applies the look from the cookie before first paint.
 * The root layout can't read the cookie itself (the landing page is static
 * and the Electron build is a static export), so this runs in the browser.
 * The provider writes the cookie from a normalized look, so it is trusted
 * here; anything unreadable falls back to the defaults.
 */
export function appearanceScript(): string {
  return `(function(){
var apply=${applyAppearance.toString()};
var root=document.documentElement;
var mq=function(q){return window.matchMedia(q).matches;};
var dark=mq("(prefers-color-scheme: dark)"),rm=mq("(prefers-reduced-motion: reduce)"),brand=location.pathname==="/";
var fallback=${JSON.stringify(DEFAULT_APPEARANCE)};
try{
var m=document.cookie.match(/(?:^|; )${APPEARANCE_COOKIE}=([^;]*)/);
apply(root,m?JSON.parse(decodeURIComponent(m[1])):fallback,dark,rm,brand);
}catch(e){try{apply(root,fallback,dark,rm,brand);}catch(e2){}}
})()`;
}
