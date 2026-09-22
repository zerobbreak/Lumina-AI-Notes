import type { User } from "../middleware/user.js";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function toPerson(user: Pick<User, "id" | "name" | "email" | "image">, role: "owner" | "viewer" | "editor") {
  return {
    userId: user.id,
    role,
    name: user.name ?? user.email ?? "Unknown",
    email: user.email,
    image: user.image,
  };
}
