import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary, reportError } from "./components/ErrorBoundary";

window.onerror = (_message, _source, _lineno, _colno, error) => {
  reportError({
    message: error?.message || String(_message),
    stack: error?.stack || `${_source}:${_lineno}:${_colno}`,
    url: window.location.href,
  });
};

window.addEventListener("unhandledrejection", (event) => {
  const error = event.reason;
  reportError({
    message: error?.message || String(error),
    stack: error?.stack || "No stack (unhandled promise rejection)",
    url: window.location.href,
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
