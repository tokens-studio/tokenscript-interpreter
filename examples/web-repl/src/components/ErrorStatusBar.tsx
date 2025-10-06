interface ErrorStatusBarProps {
  error?: string;
  errorInfo?: {
    message: string;
    line?: number;
    token?: any;
  };
}

function ErrorStatusBar({ error, errorInfo }: ErrorStatusBarProps) {
  const hasError = error || errorInfo?.message;

  if (!hasError) {
    return null;
  }

  const displayMessage = errorInfo?.line ? `Error on line ${errorInfo.line}` : "Error";

  return (
    <div
      className="bg-red-50 border-t border-red-200 px-4 py-3"
      data-testid="error-status-bar"
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{displayMessage}</p>
        </div>
      </div>
    </div>
  );
}

export default ErrorStatusBar;
