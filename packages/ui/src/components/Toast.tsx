import { CheckCircle2, X, XCircle } from "lucide-react";
import { useToast } from "../store/useToast";

export function Toast() {
  const { message, type, dismiss } = useToast();

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease-out]">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
          type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
        {type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        {message}
        <button
          type="button"
          onClick={dismiss}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
