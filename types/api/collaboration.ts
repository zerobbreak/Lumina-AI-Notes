export type CollaboratorPersonDto = {
  userId: string;
  role: "owner" | "viewer" | "editor";
  name: string;
  email?: string | null;
  image?: string | null;
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
