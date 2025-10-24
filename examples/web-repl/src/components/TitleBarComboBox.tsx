import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import { ArrowDown } from "./icons";

interface Option {
  value: string;
  label: string;
}

interface TitleBarComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  testId?: string;
}

export default function TitleBarComboBox({
  value,
  onChange,
  options,
  placeholder,
  testId,
}: TitleBarComboBoxProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as string)}
      data-testid={testId}
    >
      <Button
        className="flex h-full items-center px-3 pr-8 transition-colors relative"
        style={{
          color: currentTheme.textPrimary,
          backgroundColor: "transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = currentTheme.surfaceHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <SelectValue className="font-semibold text-sm">
          {options.find((opt) => opt.value === value)?.label || placeholder}
        </SelectValue>
        <span
          className="pointer-events-none absolute right-1 pr-1"
          style={{ color: currentTheme.textMuted }}
        >
          <ArrowDown />
        </span>
      </Button>

      <Popover
        className="min-w-[120px] mt-1 border rounded-lg shadow-xl z-50 overflow-auto"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.border,
        }}
      >
        <ListBox className="py-1">
          {options.map((option) => (
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

