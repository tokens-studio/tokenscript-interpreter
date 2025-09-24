import type React from "react";

interface ShellPanelProps {
  title: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  "data-testid"?: string;
}

function ShellPanel({ title, headerRight, className = "", children, ...rest }: ShellPanelProps) {
  return (
    <div
      className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}
      {...rest}
    >
      <div className="border-b bg-gray-50 px-3 sm:px-4 py-2 rounded-t-lg flex-shrink-0 h-10">
        <div className="flex items-center justify-between h-full w-full">
          <div className="text-xs sm:text-sm text-gray-600 font-mono truncate pr-2">{title}</div>
          {headerRight && <div className="ml-2 min-w-0 flex-shrink-0">{headerRight}</div>}
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-b-lg overflow-auto">{children}</div>
    </div>
  );
}

export default ShellPanel;
