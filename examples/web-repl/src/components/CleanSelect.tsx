import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import { ArrowDown } from "./icons";
import { HEADER_HEIGHT } from "./shared-theme";

interface Option {
  value: string;
  label: string;
}

interface CleanSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  testId?: string;
}

export default function CleanSelect({
  value,
  onChange,
  options,
  placeholder,
  testId,
}: CleanSelectProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  // Only show actual options (no placeholder in dropdown)
  const validOptions = options.filter(option => option.value !== "");

  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as string)}
      data-testid={testId}
    >
      <Button
        className="flex items-center px-3 relative group data-[pressed]:bg-transparent focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 data-[focus-visible]:outline-none data-[focus-visible]:ring-0"
        style={{
          color: currentTheme.textPrimary,
          backgroundColor: "transparent",
          height: HEADER_HEIGHT, // Match the header height exactly
          outline: "none",
          border: "none",
        }}
      >
        {/* Slanted background that appears on hover, pressed, or focus */}
        <div 
          className="absolute -skew-x-12 transform origin-left opacity-80 scale-x-0 group-hover:scale-x-100 group-data-[pressed]:scale-x-100 group-data-[focus-visible]:scale-x-100"
          style={{
            backgroundColor: currentTheme.surfaceHover,
            top: 0,
            bottom: 0,
            left: "-15px", // Extend to cover full button area
            right: "-15px", // Extend to cover full button area
          }}
        />
        
        <SelectValue className="font-semibold text-sm relative z-10">
          {validOptions.find((opt) => opt.value === value)?.label || placeholder}
        </SelectValue>
        <span
          className="pointer-events-none ml-2 relative z-10"
          style={{ color: currentTheme.textMuted }}
        >
          <ArrowDown />
        </span>
      </Button>

      <Popover
        className="min-w-[120px] border shadow-xl z-50 overflow-auto"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
          borderRadius: 0, // Square corners
          marginTop: 0, // No gap between button and dropdown
        }}
      >
        <ListBox className="py-1">
          {validOptions.map((option) => (
            <ListBoxItem
              key={option.value}
              id={option.value}
              className="px-3 py-2 text-sm cursor-pointer focus:outline-none"
              style={{ color: currentTheme.textPrimary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.surfaceHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}