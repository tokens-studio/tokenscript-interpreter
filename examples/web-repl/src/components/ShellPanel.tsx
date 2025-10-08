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
    className={`text-xs sm:text-sm text-zinc-400 font-medium truncate h-full flex items-center px-4 ${className}`}
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
      className={`flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl ${className}`}
      {...rest}
    >
      <div className="border-b border-zinc-800 bg-zinc-900/50 rounded-t-xl flex-shrink-0 h-11">
        <div className="flex items-center justify-between h-full w-full select-none">
          <ShellTitle>{title}</ShellTitle>
          {headerRight && <div className="ml-2 min-w-0 flex-shrink-0 px-4">{headerRight}</div>}
        </div>
      </div>
      <div className="flex-1 min-h-0 rounded-b-xl overflow-auto">{children}</div>
    </div>
  );
}

export default ShellPanel;
