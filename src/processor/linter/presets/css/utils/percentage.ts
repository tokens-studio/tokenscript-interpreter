import { createValidator } from "../../validators/create";
import { numberWithUnit } from "../../validators/unit";

/**
 * CSS <percentage>
 * https://developer.mozilla.org/en-US/docs/Web/CSS/percentage
 */
export const percentage = numberWithUnit({ allowedUnits: ["%"] });

/**
 * CSS <percentage> - non-negative values only
 */
export const percentageNonNegative = numberWithUnit({ min: 0, allowedUnits: ["%"] });

export const percentageValidator = createValidator(percentage);
export const percentageNonNegativeValidator = createValidator(percentageNonNegative);
