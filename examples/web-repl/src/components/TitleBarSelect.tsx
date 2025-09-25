import { ArrowDown } from "./icons";
import { DefaultShellTitle } from "./ShellPanel";

interface TitleBarSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  testId?: string;
}

function TitleBarSelect({ label, value, onChange, options, testId }: TitleBarSelectProps) {
  return (
    <div className="flex h-full items-center">
      <DefaultShellTitle>{label}</DefaultShellTitle>
      <div className="relative flex items-center h-full hover:bg-gray-100 border-l border-r border-solid border-gray-200">
        <DefaultShellTitle className="px-0">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-full appearance-none font-bold bg-transparent border-none outline-none truncate cursor-pointer px-3 pr-10"
            data-testid={testId}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-1 pr-1">
            <ArrowDown />
          </span>
        </DefaultShellTitle>
      </div>
    </div>
  );
}

export default TitleBarSelect;
