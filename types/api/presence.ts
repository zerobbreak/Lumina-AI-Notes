export type PresenceViewerDto = {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  lastSeen: number;
};

export type PresenceCountDto = {
  count: number;
};
