/** Same kinds the API accepts; "more" is a request for higher limits. */
export const FEEDBACK_KINDS = ["bug", "idea", "more", "praise", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** Body of `POST /feedback`. The API adds who sent it. */
export type SendFeedbackInput = {
  kind: FeedbackKind;
  message: string;
  rating?: number;
  page?: string;
  limitCode?: string;
  app?: string;
};
