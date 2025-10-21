import { ArrowDown } from "./icons";
import { DefaultShellTitle } from "./ShellPanel";

interface TitleBarSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  testId?: string;
}

function TitleBarSelect({ value, onChange, options, testId }: Omit<TitleBarSelectProps, "label">) {
  return (
    <div className="flex h-full items-center">
      <div className="relative flex items-center h-full hover:bg-zinc-800/50 transition-colors">
        <DefaultShellTitle className="px-0">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-full appearance-none font-semibold bg-transparent border-none outline-none truncate cursor-pointer px-3 pr-10 text-zinc-300"
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
          <span className="pointer-events-none absolute right-1 pr-1 text-zinc-500">
            <ArrowDown />
          </span>
        </DefaultShellTitle>
      </div>
    </div>
  );
}

export default TitleBarSelect;
