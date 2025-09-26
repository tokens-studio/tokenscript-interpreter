import type React from "react";

interface ShellTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ShellPanelProps {
  title: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  ShellTitle?: React.FC<{ children: React.ReactNode; className?: string }>;
  "data-testid"?: string;
}

export const DefaultShellTitle = ({ children, className }: ShellTitleProps) => (
  <div
    className={`text-xs sm:text-sm text-gray-600 font-mono truncate h-full flex items-center px-3 ${className}`}
  >
    {children}
  </div>
);

function ShellPanel({
  title,
  headerRight,
  className = "",
  children,
  ShellTitle = DefaultShellTitle,
  ...rest
}: ShellPanelProps) {
  return (
    <div
      className={`flex flex-col bg-white rounded-lg border shadow-sm ${className}`}
      {...rest}
    >
      <div className="border-b bg-gray-50 rounded-t-lg flex-shrink-0 h-10">
        <div className="flex items-center justify-between h-full w-full select-none">
          <ShellTitle>{title}</ShellTitle>
          {headerRight && <div className="ml-2 min-w-0 flex-shrink-0 px-3">{headerRight}</div>}
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-b-lg overflow-auto">{children}</div>
    </div>
  );
}

export default ShellPanel;
