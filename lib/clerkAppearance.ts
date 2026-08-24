/**
 * Shared Clerk config for sign-in, sign-up and the desktop auth callback.
 *
 * Only `variables` and `layout` live here. The visual styling is plain CSS in
 * components/paper/paper.css, targeting Clerk's stable `.cl-*` element classes,
 * because Tailwind cannot generate utilities from strings it never sees in
 * source — and because Tailwind v4 moved the important modifier to a trailing
 * `!`, which silently dropped the previous leading-`!` classes here entirely.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#191512",
    colorBackground: "#f2ede3",
    colorText: "#191512",
    colorTextSecondary: "#4d443b",
    colorTextOnPrimaryBackground: "#f2ede3",
    colorInputBackground: "#ebe3d5",
    colorInputText: "#191512",
    colorDanger: "#c43d1b",
    fontFamily: "var(--font-plex), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-plex), ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0px",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
  },
};
