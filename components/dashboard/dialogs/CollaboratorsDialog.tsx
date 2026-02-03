"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

type Role = "viewer" | "editor";

export function CollaboratorsDialog({
  open,
  onOpenChange,
  noteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: Id<"notes">;
}) {
  const access = useQuery(api.collaboration.listPeopleWithAccess, { noteId });

  const invite = useMutation(api.collaboration.inviteToNote);
  const remove = useMutation(api.collaboration.removeCollaborator);
  const updateRole = useMutation(api.collaboration.updateCollaboratorRole);
  const revokeInvite = useMutation(api.collaboration.revokeInvite);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [saving, setSaving] = useState(false);

  const isOwner = access?.viewerRole === "owner";

  const canManage = isOwner;

  const people = useMemo(() => {
    if (!access) return [];
    return [access.owner, ...(access.collaborators || [])];
  }, [access]);

  const handleInvite = async () => {
    if (!canManage) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await invite({ noteId, email: trimmed, role });
      setEmail("");
      if (res.status === "added" || res.status === "updated") {
        toast.success("Collaborator added");
      } else if (res.status === "invited") {
        toast.success("Invite sent");
      } else if (res.status === "owner") {
        toast.message("That user already owns this note.");
      } else {
        toast.success("Done");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to invite");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col gap-0 p-0 bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 shrink-0 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            Collaboration
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Invite people to view or edit this note.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-10rem)] min-h-[220px]">
          <div className="px-6 py-5 space-y-6">
            {!access && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading access…
              </div>
            )}

            {access && !canManage && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-gray-300">
                You have <span className="font-semibold">{access.viewerRole}</span>{" "}
                access. Only the owner can manage collaborators for now.
              </div>
            )}

            {/* Invite */}
            {access && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Invite
                </h3>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-gray-400">Email</Label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="bg-black/30 border-white/10 text-white"
                        disabled={!canManage || saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-400">Role</Label>
                      <Select
                        value={role}
                        onValueChange={(v) => setRole(v as Role)}
                        disabled={!canManage || saving}
                      >
                        <SelectTrigger className="w-full bg-black/30 border-white/10 text-white hover:bg-black/40 [&>span]:text-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0f0f0f] border-white/10">
                          <SelectItem
                            value="viewer"
                            className="text-gray-200 focus:bg-white/10 focus:text-white"
                          >
                            Viewer
                          </SelectItem>
                          <SelectItem
                            value="editor"
                            className="text-gray-200 focus:bg-white/10 focus:text-white"
                          >
                            Editor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    onClick={handleInvite}
                    disabled={!canManage || saving || !email.trim()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending…
                      </>
                    ) : (
                      "Send invite"
                    )}
                  </Button>
                </div>
              </section>
            )}

            {/* People with access */}
            {access && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  People with access
                </h3>
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  <div className="p-4 space-y-3">
                    {people.map((p) => {
                      const isOwnerRow = p.role === "owner";
                      const isSelfManageLocked = isOwnerRow; // owner cannot be removed/changed
                      return (
                        <div key={`${p.userId}-${p.role}`} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">
                                  {p.name}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-white/10 text-gray-200 border-white/10"
                                >
                                  {p.role}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {p.email ?? p.userId}
                              </div>
                            </div>

                            {canManage && !isSelfManageLocked && (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={p.role as Role}
                                  onValueChange={async (v) => {
                                    try {
                                      await updateRole({
                                        noteId,
                                        collaboratorUserId: p.userId,
                                        role: v as Role,
                                      });
                                      toast.success("Role updated");
                                    } catch (e: any) {
                                      toast.error(
                                        e?.message ?? "Failed to update role"
                                      );
                                    }
                                  }}
                                >
                                  <SelectTrigger className="w-[120px] bg-black/30 border-white/10 text-white hover:bg-black/40 [&>span]:text-gray-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#0f0f0f] border-white/10">
                                    <SelectItem
                                      value="viewer"
                                      className="text-gray-200 focus:bg-white/10 focus:text-white"
                                    >
                                      Viewer
                                    </SelectItem>
                                    <SelectItem
                                      value="editor"
                                      className="text-gray-200 focus:bg-white/10 focus:text-white"
                                    >
                                      Editor
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:text-white hover:bg-white/10"
                                  onClick={async () => {
                                    try {
                                      await remove({
                                        noteId,
                                        collaboratorUserId: p.userId,
                                      });
                                      toast.success("Removed");
                                    } catch (e: any) {
                                      toast.error(
                                        e?.message ?? "Failed to remove"
                                      );
                                    }
                                  }}
                                  title="Remove"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <Separator className="bg-white/10" />
                        </div>
                      );
                    })}
                    {people.length === 0 && (
                      <div className="text-sm text-gray-500">No access.</div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Pending invites */}
            {access && canManage && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pending invites
                </h3>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  {(access.invites || []).length === 0 ? (
                    <div className="text-sm text-gray-500">
                      No pending invites.
                    </div>
                  ) : (
                    (access.invites || []).map((i) => (
                      <div
                        key={`${i.email}-${i.role}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white truncate">
                              {i.email}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-white/10 text-gray-200 border-white/10"
                            >
                              {i.role}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Sent{" "}
                            {new Date(i.createdAt).toLocaleDateString(undefined, {
                              dateStyle: "medium",
                            })}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white hover:bg-white/10"
                          onClick={async () => {
                            try {
                              await revokeInvite({ noteId, email: i.email });
                              toast.success("Invite revoked");
                            } catch (e: any) {
                              toast.error(
                                e?.message ?? "Failed to revoke invite"
                              );
                            }
                          }}
                          title="Revoke invite"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

