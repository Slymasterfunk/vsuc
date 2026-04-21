/**
 * VA disability compensation rates.
 *
 * Year:           2026
 * Effective:      December 1, 2025
 * COLA:           2.8% (matches Social Security)
 * Source:         https://www.va.gov/disability/compensation-rates/veteran-rates/
 *
 * All dependent amounts are additive deltas verified against the official
 * "with dependents" table. Sum them with the veteran-alone base to match
 * VA.gov's published totals exactly.
 *
 * When the VA publishes new rates (typically October for the following year),
 * update every table below in place — the consumer only reads these exports.
 */

export const RATE_YEAR = 2026;
export const EFFECTIVE_DATE = "December 1, 2025";
export const COLA_PERCENT = 2.8;

/** Veteran-alone monthly rate, keyed by rating percentage (10–100). */
export const VA_COMP: Record<number, number> = {
  10: 180.42,
  20: 356.66,
  30: 552.47,
  40: 795.84,
  50: 1132.90,
  60: 1435.02,
  70: 1808.45,
  80: 2102.15,
  90: 2362.30,
  100: 3938.58,
};

/** Additional for a spouse, keyed by rating percentage (30–100). */
export const SPOUSE_BUMP: Record<number, number> = {
  30: 65.00,
  40: 87.00,
  50: 109.00,
  60: 131.00,
  70: 153.00,
  80: 175.00,
  90: 197.00,
  100: 219.59,
};

/** Additional per dependent parent, keyed by rating percentage (30–100). */
export const PARENT_EACH: Record<number, number> = {
  30: 52.00,
  40: 70.00,
  50: 88.00,
  60: 105.00,
  70: 123.00,
  80: 140.00,
  90: 158.00,
  100: 176.24,
};

/**
 * Veteran + 1 child (no spouse, no parents) monthly rate.
 *
 * VA "per child under 18" rates cover the SECOND child onward. The first child
 * carries a larger bump that's baked into the "with 1 child" configuration row.
 * We use this as the base when ≥1 child is claimed, then stack additional-child
 * amounts on top.
 */
export const ALONE_WITH_1_CHILD: Record<number, number> = {
  30: 596.47,
  40: 853.84,
  50: 1205.90,
  60: 1523.02,
  70: 1910.45,
  80: 2219.15,
  90: 2494.30,
  100: 4085.43,
};

/** Veteran + spouse + 1 child (no parents) monthly rate. Same purpose as above. */
export const SPOUSE_WITH_1_CHILD: Record<number, number> = {
  30: 666.47,
  40: 947.84,
  50: 1322.90,
  60: 1663.02,
  70: 2074.45,
  80: 2406.15,
  90: 2704.30,
  100: 4318.99,
};

/** Additional per child under 18 (applies to child #2 onward). */
export const CHILD_UNDER_18: Record<number, number> = {
  30: 32.00,
  40: 43.00,
  50: 54.00,
  60: 65.00,
  70: 76.00,
  80: 87.00,
  90: 98.00,
  100: 109.11,
};

/** Additional per school-aged child (18–24 in a qualifying program). */
export const CHILD_SCHOOL: Record<number, number> = {
  30: 105.00,
  40: 140.00,
  50: 176.00,
  60: 211.00,
  70: 246.00,
  80: 281.00,
  90: 317.00,
  100: 352.45,
};

/** Additional for Spouse Aid & Attendance (requires spouse claimed). */
export const SPOUSE_AA: Record<number, number> = {
  30: 61.00,
  40: 81.00,
  50: 101.00,
  60: 121.00,
  70: 141.00,
  80: 161.00,
  90: 181.00,
  100: 201.41,
};

/**
 * "With 1 school-age child" rows — derived, not published by the VA.
 *
 * The VA only publishes "with 1 child" using the under-18 first-child premium.
 * When a veteran claims only school-age children, the first-child slot still
 * exists, but it should carry the school-age premium rather than under-18.
 *
 * Derivation: take the published under-18 row and swap the first-child premium
 * by adding the per-child school-age vs. under-18 delta. The delta is constant
 * across positions (per VA's "Added amounts" column), so this is exact.
 *
 *   first_school_premium = first_under18_premium + (CHILD_SCHOOL − CHILD_UNDER_18)
 */
const deriveSchoolChildRow = (withUnder18: Record<number, number>): Record<number, number> =>
  Object.fromEntries(
    Object.entries(withUnder18).map(([rating, amt]) => {
      const r = Number(rating);
      return [r, amt + (CHILD_SCHOOL[r] - CHILD_UNDER_18[r])];
    }),
  );

export const ALONE_WITH_1_SCHOOL_CHILD: Record<number, number> = deriveSchoolChildRow(ALONE_WITH_1_CHILD);
export const SPOUSE_WITH_1_SCHOOL_CHILD: Record<number, number> = deriveSchoolChildRow(SPOUSE_WITH_1_CHILD);
