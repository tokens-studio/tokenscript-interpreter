# Math Functions

TokenScript provides a comprehensive set of mathematical functions for numeric operations.

## Unit Preservation

TokenScript treats units as metadata that persist through mathematical operations:

```
round(1.5px)     // 2px
sqrt(16rem)      // 4rem
pow(2px, 3)      // 8px
min(10px, 5px)   // 5px
```

This follows the general language behavior where `1px * 1 = 1px`.

**Exception:** `atan2` returns a unitless result since it computes an angle (radians) from coordinates.

---

## Basic Arithmetic

| Function          | Description                  | Example                   |
|-------------------|------------------------------|---------------------------|
| `abs(x)`          | Absolute value               | `abs(-5)` → `5`           |
| `sign(x)`         | Sign of number (-1, 0, or 1) | `sign(-5)` → `-1`         |
| `mod(a, b)`       | Modulo (always positive)     | `mod(-7, 3)` → `2`        |
| `remainder(a, b)` | Remainder (preserves sign)   | `remainder(-7, 3)` → `-1` |
| `pow(base, exp)`  | Exponentiation               | `pow(2, 3)` → `8`         |

---

## Rounding

| Function                 | Description              | Example                         |
|--------------------------|--------------------------|---------------------------------|
| `round(x)`               | Round to nearest integer | `round(1.5)` → `2`              |
| `floor(x)`               | Round down               | `floor(1.9)` → `1`              |
| `ceil(x)`                | Round up                 | `ceil(1.1)` → `2`               |
| `trunc(x)`               | Truncate decimal part    | `trunc(-1.9)` → `-1`            |
| `round_to(x, precision)` | Round to decimal places  | `round_to(3.14159, 2)` → `3.14` |

---

## Aggregation

All aggregation functions require at least 1 argument and preserve units from the first unit-bearing argument.

| Function             | Description                | Example                  |
|----------------------|----------------------------|--------------------------|
| `min(...values)`     | Minimum value              | `min(3, 1, 2)` → `1`     |
| `max(...values)`     | Maximum value              | `max(3, 1, 2)` → `3`     |
| `sum(...values)`     | Sum of values (min 2 args) | `sum(1, 2, 3)` → `6`     |
| `average(...values)` | Arithmetic mean            | `average(2, 4, 6)` → `4` |
| `hypot(...values)`   | Euclidean distance         | `hypot(3, 4)` → `5`      |

### Unit Conversion in `sum`

When a unit manager is configured, `sum` automatically converts compatible units:

```
sum(1in, 72pt)   // 2in (72pt = 1in)
sum(100cm, 1m)   // 200cm (1m = 100cm)
```

---

## Roots & Exponentials

| Function   | Description                   | Example                        |
|------------|-------------------------------|--------------------------------|
| `sqrt(x)`  | Square root                   | `sqrt(16)` → `4`               |
| `cbrt(x)`  | Cube root                     | `cbrt(27)` → `3`               |
| `exp(x)`   | e^x                           | `exp(1)` → `2.718...`          |
| `expm1(x)` | e^x - 1 (precise for small x) | `expm1(0.001)` → `0.001001...` |

---

## Logarithms

All logarithmic functions require positive arguments.

| Function       | Description                     | Example                        |
|----------------|---------------------------------|--------------------------------|
| `log(x)`       | Natural logarithm (ln)          | `log(e)` → `1`                 |
| `log(x, base)` | Logarithm with custom base      | `log(8, 2)` → `3`              |
| `ln(x)`        | Natural logarithm               | `ln(e)` → `1`                  |
| `log10(x)`     | Base-10 logarithm               | `log10(100)` → `2`             |
| `log2(x)`      | Base-2 logarithm                | `log2(8)` → `3`                |
| `log1p(x)`     | ln(1 + x) (precise for small x) | `log1p(0.001)` → `0.000999...` |

**Constraints:**
- `log`, `ln`, `log10`, `log2`: argument must be positive (> 0)
- `log1p`: argument must be ≥ -1
- `log(x, base)`: base must be positive and ≠ 1

---

## Trigonometry

All trigonometric functions work in radians.

| Function      | Description              | Domain                 |
|---------------|--------------------------|------------------------|
| `sin(x)`      | Sine                     | all                    |
| `cos(x)`      | Cosine                   | all                    |
| `tan(x)`      | Tangent                  | all                    |
| `asin(x)`     | Arc sine                 | [-1, 1]                |
| `acos(x)`     | Arc cosine               | [-1, 1]                |
| `atan(x)`     | Arc tangent              | all                    |
| `atan2(y, x)` | Two-argument arc tangent | all (returns unitless) |

---

## Hyperbolic Functions

| Function   | Description                | Domain     |
|------------|----------------------------|------------|
| `sinh(x)`  | Hyperbolic sine            | all        |
| `cosh(x)`  | Hyperbolic cosine          | all        |
| `tanh(x)`  | Hyperbolic tangent         | all        |
| `asinh(x)` | Inverse hyperbolic sine    | all        |
| `acosh(x)` | Inverse hyperbolic cosine  | x ≥ 1      |
| `atanh(x)` | Inverse hyperbolic tangent | -1 < x < 1 |

---

## Constants

| Function | Value             |
|----------|-------------------|
| `pi()`   | 3.141592653589793 |
