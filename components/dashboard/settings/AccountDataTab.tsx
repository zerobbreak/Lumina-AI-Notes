"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accountApi } from "@/lib/api/domains/account.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { useDeleteAccount } from "@/lib/mutations/users/useDeleteAccount";
import { DELETE_ACCOUNT_CONFIRMATION } from "@/types/api/account";

export function AccountDataTab() {
  return (
    <>
      <ExportCard />
      <DeleteAccountCard />
    </>
  );
}

function ExportCard() {
  const { getApiToken } = useApiToken();
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const data = await accountApi.exportData(await getApiToken());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lumina-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't export your data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-background border border-border/60 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Export your data</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Download your notes, flashcards, quizzes, deadlines, chats and recording transcripts as
          one JSON file. Uploaded files and audio are listed but not included; download those from
          the app.
        </p>
      </div>
      <Button variant="outline" onClick={download} disabled={exporting}>
        {exporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {exporting ? "Preparing…" : "Download my data"}
      </Button>
    </div>
  );
}

function DeleteAccountCard() {
  const { signOut } = useClerk();
  const deleteAccount = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const confirmed = typed === DELETE_ACCOUNT_CONFIRMATION;

  const onDelete = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        toast.success("Your account has been deleted");
        await signOut({ redirectUrl: "/" });
      },
      onError: () => toast.error("Couldn't delete your account. Nothing was removed; try again."),
    });
  };

  return (
    <div className="p-6 rounded-2xl bg-background border border-destructive/40 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-semibold text-foreground">Delete account</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently deletes your account and everything in it. Notes you shared stop being
          available to collaborators. This can&apos;t be undone, so export your data first if you
          want to keep it.
        </p>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (deleteAccount.isPending) return;
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Delete my account
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your notes, flashcards, quizzes, recordings, files and chats will be deleted for
              good. Type <span className="font-mono font-semibold">{DELETE_ACCOUNT_CONFIRMATION}</span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={DELETE_ACCOUNT_CONFIRMATION}
            aria-label={`Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm`}
            autoComplete="off"
            disabled={deleteAccount.isPending}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={!confirmed || deleteAccount.isPending}
            >
              {deleteAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
