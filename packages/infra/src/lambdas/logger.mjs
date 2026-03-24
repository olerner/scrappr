export function createLogger(event) {
  const requestId = event.requestContext?.requestId || "unknown";
  const path = event.rawPath || event.requestContext?.http?.path || "unknown";
  const method = event.requestContext?.http?.method || "unknown";
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub || "anonymous";
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || "unknown";

  const base = { functionName, requestId, path, method, userId };

  return {
    error(message, error, extra = {}) {
      console.error(
        JSON.stringify({
          level: "ERROR",
          message,
          ...base,
          errorName: error?.name,
          errorMessage: error?.message,
          stack: error?.stack,
          ...extra,
        }),
      );
    },
    info(message, extra = {}) {
      console.log(
        JSON.stringify({
          level: "INFO",
          message,
          ...base,
          ...extra,
        }),
      );
    },
  };
}
