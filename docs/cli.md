# CLI Reference

## Installation

```bash
npm install -g @tokens-studio/tokenscript-interpreter
```

## Commands

- [`repl`](#repl) - Interactive REPL mode
- [`process`](#process) - Process design tokens from files
- [`inspect`](#inspect) - Inspect themes and sets
- [`eval`](#eval) - Evaluate a single expression

---

## repl

Start an interactive REPL session.

```bash
tokenscript repl [options]
```

### Options

| Option                  | Description                                    |
|-------------------------|------------------------------------------------|
| `--mode <mode>`         | Execution mode: `inline` (default) or `script` |
| `--schema <uris...>`    | Schema URIs to fetch and register              |
| `--reference <refs...>` | Reference values in `key:value` format         |

### Reference Injection

Pass initial variables using `--reference`:

```bash
# Single reference
tokenscript repl --reference="color:#ff0000"

# Multiple references
tokenscript repl --reference="primary:#ff0000" --reference="spacing:16"

# JSON values (numbers, arrays)
tokenscript repl --reference="scale:1.5" --reference="sizes:[8,16,24]"
```

Values are parsed as JSON when possible, otherwise treated as strings.

### Execution Modes

**Inline mode** (default): Each line executes immediately.

**Script mode**: Lines accumulate, useful for multi-line expressions.

```bash
tokenscript repl --mode script
```

### Commands

- `exit()` - Exit the REPL
- `clear()` - Clear screen and reset buffer

---

## process

Process design tokens from a file, archive, or directory.

```bash
tokenscript process --input <path> [options]
```

### Options

| Option                | Description                                             |
|-----------------------|---------------------------------------------------------|
| `--input <path>`      | **(required)** Path to JSON file, archive, or directory |
| `--output <path>`     | Output file path (prints to console if omitted)         |
| `--schema <uris...>`  | Schema URIs to fetch and register                       |
| `--sets <sets>`       | Comma-separated list of token sets to process           |
| `--theme <theme>`     | Theme name for token set selection                      |
| `--format <format>`   | Output format: `nested` (default) or `flat`             |
| `--log-level <level>` | Log level: `warn`, `error`, or `none` (default)         |
| `--strict`            | Exit with error code if any issues exist                |

### Examples

```bash
# Process tokens and print to console
tokenscript process --input ./tokens.json

# Process with specific theme and output to file
tokenscript process --input ./tokens --theme dark --output ./output.json

# Process specific sets with flat output
tokenscript process --input ./tokens.zip --sets "core,semantic" --format flat
```

---

## inspect

Inspect available themes and token sets in a file.

```bash
tokenscript inspect --input <path>
```

### Options

| Option | Description |
|--------|-------------|
| `--input <path>` | **(required)** Path to JSON file, archive, or directory |

### Example

```bash
tokenscript inspect --input ./tokens.json
```

Output:

```json
{
  "sets": ["core", "semantic", "components"],
  "themes": {
    "light": ["core", "semantic/light"],
    "dark": ["core", "semantic/dark"]
  }
}
```

---

## eval

Evaluate a TokenScript expression and output the result as JSON.

```bash
tokenscript eval [expression] [options]
```

### Options

| Option               | Description                        |
|----------------------|------------------------------------|
| `--stdin`            | Read expression from stdin         |
| `--schema <uris...>` | Schema URIs to fetch and register  |
| `--refs <json>`      | JSON object of variable references |

### Examples

```bash
# Evaluate inline expression
tokenscript eval "1 + 2 * 3"

# With references
tokenscript eval "base * 2" --refs '{"base": 8}'

# From stdin
echo "rgb(255, 0, 0)" | tokenscript eval --stdin
```
