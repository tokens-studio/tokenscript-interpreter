import { or } from "../../validators/combinators";
import { createValidator } from "../../validators/create";
import { length, lengthNonNegative } from "./length";
import { percentage, percentageNonNegative } from "./percentage";

/**
 * CSS <length-percentage> - either length or percentage
 * https://developer.mozilla.org/en-US/docs/Web/CSS/length-percentage
 */
export const lengthPercentage = or(length, percentage);

/**
 * CSS <length-percentage> - non-negative values only
 */
export const lengthPercentageNonNegative = or(lengthNonNegative, percentageNonNegative);

export const lengthPercentageValidator = createValidator(lengthPercentage);
export const lengthPercentageNonNegativeValidator = createValidator(lengthPercentageNonNegative);
