import type { CSSProperties, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Masthead } from "@/components/home/landing/Masthead";

const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    style,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    prefetch?: boolean;
    href: string;
    className?: string;
    style?: CSSProperties;
    "aria-label"?: string;
  }) => (
    <a href={href} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: linkStatus.pending }),
}));

vi.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: { children: ReactNode }) => children,
  SignedOut: () => null,
  UserButton: () => null,
}));

vi.mock("@/components/auth/LoginButton", () => ({
  LoginButton: () => null,
}));

describe("Masthead dashboard navigation", () => {
  it("shows immediate feedback while the dashboard route is pending", () => {
    linkStatus.pending = false;
    expect(renderToStaticMarkup(<Masthead />)).toContain("Dashboard");

    linkStatus.pending = true;
    const pendingMarkup = renderToStaticMarkup(<Masthead />);

    expect(pendingMarkup).toContain("Opening workspace...");
    expect(pendingMarkup).toContain('aria-label="Open dashboard"');
    expect(pendingMarkup).toContain('href="/dashboard"');
  });
});
