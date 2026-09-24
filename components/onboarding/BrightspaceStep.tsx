"use client";

import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { ConnectForm } from "@/components/dashboard/settings/IntegrationsTab";
import { useBrightspaceStatus } from "@/lib/queries/integrations/useBrightspaceStatus";
import { useCurrentUser } from "@/lib/queries/users/useCurrentUser";

/**
 * Onboarding's Brightspace option: paste the calendar link and Lumina sets up
 * the student's courses and deadlines from it. Skippable; hidden when the
 * server can't store Brightspace links.
 */
export function BrightspaceStep() {
  const { data: status, isLoading, error } = useBrightspaceStatus();
  const { data: user } = useCurrentUser();

  if (error) return null;

  return (
    <section className="rounded-2xl border border-border bg-foreground/[0.02] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <GraduationCap className="w-5 h-5 mt-0.5 shrink-0 text-primary" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Use Brightspace?</h3>
          <p className="text-sm text-muted-foreground">
            Connect your calendar and Lumina sets up your courses and due dates for you.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Checking…
        </div>
      ) : status?.connected ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden />
            Connected to {status.host} · {status.deadlineCount} deadline
            {status.deadlineCount === 1 ? "" : "s"}
          </p>
          {user?.courses && user.courses.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Your courses">
              {user.courses.map((course) => (
                <li
                  key={course.id}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                >
                  {course.name}
                  {course.code && <span className="ml-1.5 text-muted-foreground">{course.code}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <ConnectForm />
      )}
    </section>
  );
}
