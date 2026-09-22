import type { ErrorRequestHandler, RequestHandler } from "express";

/** Throw from any handler to send a JSON error with the given status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`, "not_found"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "payload_too_large", message: "Request is too large" } });
    return;
  }

  // body-parser attaches a status to malformed payloads.
  const status = typeof err?.status === "number" ? err.status : 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: {
      code: status >= 500 ? "internal_error" : "bad_request",
      message: status >= 500 ? "Internal server error" : String(err?.message ?? "Bad request"),
    },
  });
};
