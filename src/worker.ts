type StaticAssets = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS: StaticAssets;
};

const CSP_REPORT_PATH = "/csp-report";
const MAX_REPORT_BYTES = 16 * 1024;
const ACCEPTED_CONTENT_TYPES = new Set([
  "application/csp-report",
  "application/reports+json",
]);

const jsonResponse = (body: unknown, init: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });

const isAcceptedContentType = (contentType: string | null) => {
  if (!contentType) return false;

  const [mediaType] = contentType.toLowerCase().split(";", 1);
  return ACCEPTED_CONTENT_TYPES.has(mediaType.trim());
};

const parseContentLength = (contentLength: string | null) => {
  if (!contentLength) return undefined;

  const parsed = Number(contentLength);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const readLimitedText = async (request: Request) => {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_REPORT_BYTES) {
      await reader.cancel();
      return undefined;
    }

    chunks.push(value);
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
};

const readReportBody = async (request: Request) => {
  const body = await readLimitedText(request);
  if (body === undefined) {
    return { tooLarge: true as const };
  }

  try {
    return { data: JSON.parse(body) as unknown };
  } catch {
    return { invalidJson: true as const };
  }
};

const redactPotentialUrl = (value: string) => {
  if (value.startsWith("data:")) return "data:";
  if (value.startsWith("blob:")) return "blob:";

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `${url.origin}${url.pathname}`;
    }

    return `${url.protocol}`;
  } catch {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
};

const sanitizeForLog = (value: unknown, depth = 0): unknown => {
  if (depth > 8) return "[truncated]";

  if (typeof value === "string") {
    return redactPotentialUrl(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sanitizeForLog(item, depth + 1),
      ]),
    );
  }

  return value;
};

const logCspReport = (request: Request, report: unknown) => {
  console.log(
    JSON.stringify({
      type: "csp-report",
      receivedAt: new Date().toISOString(),
      userAgent: sanitizeForLog(request.headers.get("user-agent")),
      report: sanitizeForLog(report),
    }),
  );
};

const handleCspReport = async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "method_not_allowed" },
      { status: 405, headers: { allow: "POST, OPTIONS" } },
    );
  }

  const contentLength = parseContentLength(
    request.headers.get("content-length"),
  );
  if (contentLength && contentLength > MAX_REPORT_BYTES) {
    return jsonResponse({ error: "payload_too_large" }, { status: 413 });
  }

  if (!isAcceptedContentType(request.headers.get("content-type"))) {
    return jsonResponse({ error: "unsupported_media_type" }, { status: 415 });
  }

  const reportBody = await readReportBody(request);
  if ("tooLarge" in reportBody) {
    return jsonResponse({ error: "payload_too_large" }, { status: 413 });
  }

  if ("invalidJson" in reportBody) {
    return jsonResponse({ error: "invalid_json" }, { status: 400 });
  }

  logCspReport(request, reportBody.data);

  return new Response(null, { status: 204 });
};

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === CSP_REPORT_PATH) {
      return handleCspReport(request);
    }

    return env.ASSETS.fetch(request);
  },
};
