import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import type { ShareState } from "../utils/share";
import { getShareUrl } from "../utils/share";

interface SharePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  shareState: ShareState;
  anchorRef?: React.RefObject<HTMLElement>;
}

export default function SharePopover({ isOpen, onClose, shareState, anchorRef }: SharePopoverProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShareUrl(getShareUrl(shareState));
    }
  }, [isOpen, shareState]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

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
    <div
      ref={popoverRef}
      className="fixed z-50 rounded-lg shadow-xl p-4 max-w-sm"
      style={{
        backgroundColor: currentTheme.surface,
        border: `1px solid ${currentTheme.border}`,
        top: "60px",
        right: "20px",
      }}
    >
      <h3
        className="text-sm font-semibold mb-3"
        style={{ color: currentTheme.textPrimary }}
      >
        Share Link
      </h3>

      {/* URL Input */}
      <div className="mb-3 flex gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 px-2 py-1.5 rounded text-xs font-mono"
          style={{
            backgroundColor: currentTheme.background,
            border: `1px solid ${currentTheme.border}`,
            color: currentTheme.textPrimary,
          }}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap"
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
  );
}
