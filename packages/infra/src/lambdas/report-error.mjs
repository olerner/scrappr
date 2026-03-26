const MAX_FIELD_LENGTH = 2000;
const MAX_BODY_BYTES = 64 * 1024; // 64 KB — well below API GW's 10 MB default

/** Truncate a string to a maximum length, appending an indicator if cut. */
function truncate(str, max) {
  if (typeof str !== "string") return null;
  if (str.length <= max) return str;
  return str.slice(0, max) + " [truncated]";
}

export const handler = async (event) => {
  try {
    // Reject oversized bodies before parsing
    const rawBody = event.body || "{}";
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return {
        statusCode: 413,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Payload too large" }),
      };
    }

    const body = JSON.parse(rawBody);
    const { message, stack, url, userAgent, timestamp } = body;

    console.error(
      JSON.stringify({
        level: "ERROR",
        source: "frontend",
        message: truncate(message, MAX_FIELD_LENGTH) || "Unknown client error",
        stack: truncate(stack, MAX_FIELD_LENGTH),
        url: truncate(url, MAX_FIELD_LENGTH),
        userAgent: truncate(userAgent, 500),
        timestamp: truncate(timestamp, 50) || new Date().toISOString(),
        requestId: event.requestContext?.requestId || "unknown",
      }),
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        message: "report-error handler failed",
        errorMessage: err.message,
      }),
    );
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
