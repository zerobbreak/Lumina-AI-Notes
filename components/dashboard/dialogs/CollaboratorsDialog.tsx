"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Globe, 
  Settings, 
  User, 
  Users, 
  Copy, 
  Check, 
  Loader2 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Role = "viewer" | "editor";

const getInitials = (str: string) => {
  if (!str) return "?";
  const parts = str.split(/[\s.@]+/);
  if (parts.length > 1 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.substring(0, 1).toUpperCase(); // Notion uses just 1 letter usually
};

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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/dashboard?noteId=${noteId}`);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Notion style modal: flat surface, tight padding, clean gray text, simple borders */}
      <DialogContent className="sm:max-w-[480px] w-[calc(100vw-2rem)] p-0 bg-[#202020] border-[#373737] text-[#EBEBEB] shadow-[0_4px_24px_rgba(0,0,0,0.6)] rounded-[8px] overflow-hidden gap-0 flex flex-col font-sans">
        
        {/* Top Header Section */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#373737]">
          <div className="flex items-center gap-2 px-1 text-sm font-medium">
            Share
          </div>
        </div>

        {/* Loading State */}
        {!access && (
          <div className="flex items-center justify-center py-12 text-[#9B9B9B]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {/* Input Section */}
        {access && canManage && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#373737]">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Add emails or people..."
              className="flex-1 h-8 bg-transparent border-none text-[#EBEBEB] placeholder:text-[#9B9B9B] focus-visible:ring-0 shadow-none px-0 text-sm"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInvite();
              }}
            />
            {email.trim() && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as Role)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-7 w-[90px] bg-transparent border-none text-[#9B9B9B] hover:text-[#EBEBEB] hover:bg-[#2F2F2F] focus:ring-0 rounded-[4px] px-2 text-[13px] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-[#373737] rounded-[6px] shadow-xl min-w-[120px]">
                    <SelectItem value="viewer" className="text-[#EBEBEB] focus:bg-[#373737] focus:text-[#EBEBEB] rounded-[4px] text-[13px]">Can view</SelectItem>
                    <SelectItem value="editor" className="text-[#EBEBEB] focus:bg-[#373737] focus:text-[#EBEBEB] rounded-[4px] text-[13px]">Can edit</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="h-7 px-3 rounded-[4px] bg-[#EBEBEB] hover:bg-[#D4D4D4] text-[#202020] text-[13px] font-medium transition-none shrink-0"
                  onClick={handleInvite}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Invite"}
                </Button>
              </div>
            )}
          </div>
        )}

        {access && !canManage && (
          <div className="px-5 py-4 text-[13px] text-[#9B9B9B] border-b border-[#373737]">
            You have <span className="text-[#EBEBEB]">{access.viewerRole}</span> access. 
            Only the owner can add collaborators to this note.
          </div>
        )}

        {/* Lists Section */}
        <ScrollArea className="max-h-[320px] bg-[#202020]">
          {access && (
            <div className="px-2 py-3">
              {/* Existing Collaborators */}
              <div className="space-y-0.5">
                {people.map((p) => {
                  const isOwnerRow = p.role === "owner";
                  const label = p.name || p.email || p.userId;
                  const initials = getInitials(label);

                  return (
                    <div 
                      key={`${p.userId}-${p.role}`} 
                      className="group flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-[#2F2F2F] rounded-[4px] transition-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Simple Flat Avatar */}
                        <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 font-medium text-[13px] bg-[#E16259]/20 text-[#E16259]">
                          {initials}
                        </div>
                        
                        <div className="min-w-0 flex flex-col">
                          <span className="text-[13px] text-[#EBEBEB] truncate leading-tight">
                            {label}
                          </span>
                          {/* If they have an email but also a name, show email muted */}
                          {p.name && p.email && (
                            <span className="text-[12px] text-[#9B9B9B] truncate leading-tight mt-0.5">
                              {p.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        {canManage && !isOwnerRow ? (
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Select
                              value={p.role as Role}
                              onValueChange={async (v) => {
                                if (v === "remove") {
                                  try { await remove({ noteId, collaboratorUserId: p.userId }); } catch {}
                                  return;
                                }
                                try {
                                  await updateRole({ noteId, collaboratorUserId: p.userId, role: v as Role });
                                } catch {}
                              }}
                            >
                              <SelectTrigger className="h-6 w-auto bg-transparent border-none text-[#9B9B9B] hover:text-[#EBEBEB] focus:ring-0 rounded-[4px] px-2 text-[12px] shadow-none justify-end gap-1">
                                {p.role === "editor" ? "Can edit" : "Can view"}
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#373737] rounded-[6px] shadow-xl min-w-[120px]">
                                <SelectItem value="viewer" className="text-[#EBEBEB] focus:bg-[#373737] rounded-[4px] text-[13px]">Can view</SelectItem>
                                <SelectItem value="editor" className="text-[#EBEBEB] focus:bg-[#373737] rounded-[4px] text-[13px]">Can edit</SelectItem>
                                <div className="h-px bg-[#373737] my-1 mr-1" />
                                <SelectItem 
                                  value="remove" 
                                  className="text-[#EB5757] focus:bg-[#373737] focus:text-[#EB5757] rounded-[4px] text-[13px]"
                                >
                                  Remove
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-[12px] text-[#9B9B9B] px-2">
                            {isOwnerRow ? "Full access" : (p.role === "editor" ? "Can edit" : "Can view")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pending Invites */}
              {canManage && (access.invites || []).length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {(access.invites || []).map((i) => (
                    <div
                      key={i.email}
                      className="group flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-[#2F2F2F] rounded-[4px] transition-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 font-medium text-[13px] border border-[#373737] bg-transparent text-[#9B9B9B]">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <span className="text-[13px] text-[#EBEBEB] truncate leading-tight">
                            {i.email}
                          </span>
                          <span className="text-[12px] text-[#9B9B9B] truncate leading-tight mt-0.5">
                            Invited to {i.role === "editor" ? "edit" : "view"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[12px] px-2 text-[#9B9B9B] hover:text-[#EBEBEB] hover:bg-transparent opacity-0 group-hover:opacity-100 transition-opacity shrink-0 shadow-none border gap-0 font-normal border-[#373737]"
                        onClick={async () => {
                          try {
                            await revokeInvite({ noteId, email: i.email });
                          } catch {}
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer actions like Notion */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#262626] border-t border-[#373737]">
          <div className="flex items-center gap-2 text-[13px] text-[#9B9B9B]">
            <Globe className="w-4 h-4" />
            No web access
          </div>
          <Button
            variant="ghost"
            onClick={handleCopyLink}
            className="h-7 px-2.5 text-[13px] text-[#EBEBEB] hover:bg-[#373737] border border-[#373737] shadow-none gap-1.5 font-normal rounded-[4px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
