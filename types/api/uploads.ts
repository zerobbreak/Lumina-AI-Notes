export type UploadTargetDto = {
  key: string;
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
};

export type UploadStatDto = {
  key: string;
  size: number;
  contentType?: string;
};
