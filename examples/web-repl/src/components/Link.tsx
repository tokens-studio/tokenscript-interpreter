import { type ReactNode, forwardRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, className = "", style = {}, title, target = "_blank", rel, ...props }, ref) => {
    const { theme } = useTheme();
    const currentTheme = getTheme(theme);

    return (
      <a
        ref={ref}
        href={href}
        title={title}
        target={target}
        rel={rel || (target === "_blank" ? "noopener noreferrer" : undefined)}
        className={`transition-colors cursor-pointer ${className}`}
        style={{
          color: currentTheme.textMuted,
          textDecoration: "none",
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = currentTheme.logoAction;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = style.color || currentTheme.textMuted;
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
);

Link.displayName = "Link";

export default Link;