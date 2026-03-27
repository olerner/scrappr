const MAX_BODY_BYTES = 64 * 1024; // 64KB
const MAX_FIELD_LENGTH = 2000;

function truncate(val) {
  if (typeof val !== "string") return null;
  return val.slice(0, MAX_FIELD_LENGTH);
}

export const handler = async (event) => {
  try {
    if ((event.body || "").length > MAX_BODY_BYTES) {
      return { statusCode: 413, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Payload too large" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { message, stack, url, userAgent, timestamp } = body;

    console.error(
      JSON.stringify({
        level: "ERROR",
        source: "frontend",
        message: truncate(message) || "Unknown client error",
        stack: truncate(stack),
        url: truncate(url),
        userAgent: truncate(userAgent),
        timestamp: truncate(timestamp) || new Date().toISOString(),
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
