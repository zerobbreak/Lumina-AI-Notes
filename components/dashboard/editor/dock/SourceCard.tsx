"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/useDashboard";
import { toRecording } from "@/lib/api/adapters/recording";
import { recordingsApi } from "@/lib/api/domains/recordings.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { recordingKeys } from "@/lib/query-keys/recordings";
import { normalizeTranscriptForPrompt } from "@/lib/shared/transcript";

function formatDuration(seconds: number) {
  const m = Math.round(seconds / 60);
  return m < 1 ? "under a minute" : `${m} min`;
}

/** The lecture recording this note was generated from. */
export function SourceCard({ recordingId }: { recordingId: string }) {
  const { getApiToken, isReady } = useApiToken();
  const { loadSession } = useDashboard();
  const { data: recording, isLoading, isError } = useQuery({
    queryKey: recordingKeys.detail(recordingId),
    queryFn: async () => toRecording(await recordingsApi.getById(await getApiToken(), recordingId)),
    enabled: isReady,
  });

  if (isLoading) return <p className="text-[12.5px] text-muted-foreground">Loading…</p>;
  if (isError || !recording) {
    return <p className="text-[12.5px] text-muted-foreground">The recording for this note was deleted.</p>;
  }

  const details = [
    "Lecture",
    recording.duration ? formatDuration(recording.duration) : null,
    new Date(recording.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  ].filter(Boolean);

  return (
    <div className="space-y-2.5">
      <div>
        <p className="line-clamp-2 text-[13px] font-medium text-foreground">{recording.title}</p>
        <p className="text-[11.5px] text-muted-foreground">{details.join(" · ")}</p>
      </div>
      {recording.audioUrl && (
        <audio controls preload="none" src={recording.audioUrl} className="h-8 w-full">
          Your browser can&apos;t play this recording.
        </audio>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-7 w-full text-[12.5px]"
        onClick={() => {
          const transcript = normalizeTranscriptForPrompt(recording.transcript);
          if (!transcript) {
            toast.error("That recording has no transcript");
            return;
          }
          loadSession({
            recordingId: recording._id,
            title: recording.title,
            transcript,
            duration: recording.duration ?? undefined,
          });
          toast.success("Transcript loaded into the capture pill");
        }}
      >
        Load transcript into capture
      </Button>
    </div>
  );
}
