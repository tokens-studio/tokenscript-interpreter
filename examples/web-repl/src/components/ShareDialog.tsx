import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import type { ShareState } from "../utils/share";
import { getShareUrl } from "../utils/share";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shareState: ShareState;
}

export default function ShareDialog({ isOpen, onClose, shareState }: ShareDialogProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setShareUrl(getShareUrl(shareState));
    }
  }, [isOpen, shareState]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onClose}
        role="presentation"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="rounded-lg shadow-lg max-w-md w-full p-6"
          style={{
            backgroundColor: currentTheme.surface,
            border: `1px solid ${currentTheme.border}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: currentTheme.textPrimary }}
          >
            Share Link
          </h2>

          {/* Info Box */}
          <div
            className="rounded p-3 mb-4 text-sm"
            style={{
              backgroundColor: currentTheme.background,
              border: `1px solid ${currentTheme.border}`,
              color: currentTheme.textSecondary,
            }}
          >
            <p className="font-medium mb-1">This link includes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Version {shareState.version} (for backwards compatibility)</li>
              <li>Current {shareState.mode} code</li>
              <li>{shareState.colorSchemas.length} color schema(s)</li>
              <li>{shareState.functionSchemas.length} function schema(s)</li>
            </ul>
          </div>

          {/* URL Input */}
          <div className="mb-4">
            <label
              className="block text-xs font-medium mb-2"
              style={{ color: currentTheme.textSecondary }}
            >
              Share URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 rounded text-sm font-mono overflow-auto"
                style={{
                  backgroundColor: currentTheme.background,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.textPrimary,
                  maxHeight: "100px",
                }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded font-medium text-sm transition-colors"
                style={{
                  backgroundColor: copied ? "#10b981" : currentTheme.accentColor,
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  if (!copied) e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: currentTheme.border,
                color: currentTheme.textPrimary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
