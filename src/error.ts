import type { ApiErrorBody } from "./types.js";

export class RogerIQError extends Error {
  code: string;
  status: number;
  requestId?: string;
  issues?: ApiErrorBody["issues"];
  retryAfter?: number;

  constructor(message: string, opts: {
    code?: string;
    status: number;
    requestId?: string;
    issues?: ApiErrorBody["issues"];
    retryAfter?: number;
  }) {
    super(message);
    this.name = "RogerIQError";
    this.code = opts.code ?? `HTTP_${opts.status}`;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.issues = opts.issues;
    this.retryAfter = opts.retryAfter;
  }
}
