import { Component, type ErrorInfo, type ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export function reportError(payload: { message: string; stack?: string; url: string }) {
  if (!API_URL) return;
  fetch(`${API_URL}/errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    /* fire-and-forget */
  });
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      message: error.message,
      stack: [error.stack, info.componentStack].filter(Boolean).join("\n---\n"),
      url: window.location.href,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">An unexpected error occurred.</p>
            <button
              type="button"
              className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
