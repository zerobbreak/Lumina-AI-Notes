export type NotificationDto = {
  id: string;
  userId: string;
  type: "deadline_reminder";
  title: string;
  body?: string;
  href?: string;
  createdAt: number;
  readAt?: number;
};

export type UnreadCountDto = {
  count: number;
};
