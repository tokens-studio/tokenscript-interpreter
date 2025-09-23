import type { ReactNode } from "react";

interface PanelShellProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  testId?: string;
}

export function PanelShell({
  title,
  children,
  className = "",
  headerRight,
  testId,
}: PanelShellProps) {
  return (
    <div
      className={`flex flex-col bg-white rounded-lg border shadow-sm h-full ${className}`}
      data-testid={testId}
    >
      <div
        className="border-b bg-gray-50 px-3 sm:px-4 py-2 rounded-t-lg flex-shrink-0 h-10"
        data-testid={testId ? `${testId}-header` : undefined}
      >
        <div className="flex items-center justify-between h-full w-full">
          <div
            className="text-xs sm:text-sm text-gray-600 font-mono truncate pr-2"
            data-testid={testId ? `${testId}-title` : undefined}
          >
            {title}
          </div>
          {headerRight && <div className="ml-2 min-w-0 flex-shrink-0">{headerRight}</div>}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-b-lg overflow-auto">{children}</div>
    </div>
  );
}
