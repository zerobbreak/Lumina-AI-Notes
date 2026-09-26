/**
 * Sends in-app feedback to a Google Form, so responses land in the owner's
 * Google account (and its linked Sheet) with no admin screen to build.
 *
 * Configured with the form's pre-filled link: in the form, "Get pre-filled
 * link", type each field's key below as its answer, and copy the link. The
 * entry ids are read from it, so reordering or renaming questions in the form
 * only needs a fresh link, not a code change.
 */
export const FORM_FIELDS = ["type", "message", "rating", "email", "name", "userId", "page", "limit", "app"] as const;
export type FormField = (typeof FORM_FIELDS)[number];

export type GoogleForm = {
  /** The form's formResponse URL, which takes a urlencoded POST. */
  action: string;
  /** Our field key -> the form's "entry.<id>" name. */
  entries: Partial<Record<FormField, string>>;
};

/** Parses a pre-filled link, or null when it isn't one we can submit to. */
export function parseFormPrefillUrl(value: string): GoogleForm | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  const match = /^\/forms\/d\/e\/([\w-]+)\/viewform$/.exec(url.pathname);
  if (url.hostname !== "docs.google.com" || !match) return null;

  const entries: GoogleForm["entries"] = {};
  for (const [name, answer] of url.searchParams) {
    const field = FORM_FIELDS.find((key) => key.toLowerCase() === answer.trim().toLowerCase());
    if (/^entry\.\d+$/.test(name) && field) entries[field] = name;
  }
  // Without somewhere to put the message there's nothing worth sending.
  if (!entries.message) return null;
  return { action: `https://docs.google.com/forms/d/e/${match[1]}/formResponse`, entries };
}

/** Submits one response. Fields the form doesn't have are left out. Throws when Google refuses it. */
export async function submitToGoogleForm(
  form: GoogleForm,
  values: Partial<Record<FormField, string>>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const body = new URLSearchParams();
  for (const field of FORM_FIELDS) {
    const entry = form.entries[field];
    const value = values[field];
    if (entry && value) body.append(entry, value);
  }
  const res = await fetchImpl(form.action, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  // Google answers a recorded response with 200 (or a redirect to the
  // confirmation page); a changed or closed form gets a 4xx.
  if (res.status >= 400 || res.status === 0) {
    throw new Error(`Google Form refused the response (HTTP ${res.status})`);
  }
}
