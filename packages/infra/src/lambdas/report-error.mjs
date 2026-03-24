export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { message, stack, url, userAgent, timestamp } = body;

    console.error(
      JSON.stringify({
        level: "ERROR",
        source: "frontend",
        message: message || "Unknown client error",
        stack: stack || null,
        url: url || null,
        userAgent: userAgent || null,
        timestamp: timestamp || new Date().toISOString(),
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
