import type { ReactNode } from "react";

export function AuthLayout({
  heading,
  subtitle,
  children,
}: {
  heading: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h2 className={`text-xl font-bold text-gray-900 text-center ${subtitle ? "mb-2" : "mb-6"}`}>
          {heading}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 mb-6 text-center">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
