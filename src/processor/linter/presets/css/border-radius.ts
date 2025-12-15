import { oneOrList } from "../validators/combinators";
import { createValidator } from "../validators/create";
import { lengthPercentageNonNegative } from "./utils/length-percentage";

/**
 * CSS border-radius: <length-percentage>{1,4}
 * https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius
 *
 * Accepts 1-4 non-negative length or percentage values:
 * - 1 value: all four corners
 * - 2 values: top-left/bottom-right, top-right/bottom-left
 * - 3 values: top-left, top-right/bottom-left, bottom-right
 * - 4 values: top-left, top-right, bottom-right, bottom-left
 *
 * Note: This validates simple border-radius, not the full syntax
 * with horizontal/vertical radii separated by "/".
 */
export const borderRadius = oneOrList(lengthPercentageNonNegative, {
  allowedCounts: [1, 2, 3, 4],
});

export const borderRadiusValidator = createValidator(borderRadius);
