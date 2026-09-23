export type CollaboratorPersonDto = {
  userId: string;
  role: "owner" | "viewer" | "editor";
  name: string;
  email?: string | null;
  image?: string | null;
};

export type NoteRoleDto = "owner" | "viewer" | "editor";

export type NoteAccessDto = {
  role: NoteRoleDto;
};

export type PendingInviteDto = {
  email: string;
  role: "viewer" | "editor";
  createdAt: number;
};

export type CollaboratorsListDto = {
  viewerRole: "owner" | "viewer" | "editor";
  owner: CollaboratorPersonDto;
  collaborators: CollaboratorPersonDto[];
  invites: PendingInviteDto[];
};

export type InviteToNoteResultDto = {
  status: "owner" | "added" | "updated" | "invited";
  added?: boolean;
  invited?: boolean;
};
