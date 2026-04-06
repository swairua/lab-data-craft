

# Fix Build Error and Verify Atterberg Calculations

## Build Error Fix

**File**: `src/components/TestSection.tsx`, line 62

The `onSave` prop is typed as `() => void | Promise<void>`, so `result` is always `void`. Comparing `void !== false` is a TypeScript error. Fix: change the prop type to allow returning `boolean | void` or remove the comparison.

**Fix**: Update the `onSave` type in the interface from `() => void | Promise<void>` to `() => void | boolean | Promise<void | boolean>`, which allows save handlers to optionally return `false` to suppress the success toast.

## Excel Verification

I parsed the uploaded Excel and cross-checked the formulas against our implementation:

- **Moisture**: `(wet - dry) / (dry - container) * 100` — matches `calculateMoistureFromMass`
- **LL at 20mm**: Linear interpolation at 20mm penetration — matches `calculateLiquidLimit` (target=20)
- **PL**: Average of plastic limit moisture values — matches `calculatePlasticLimit`
- **Linear Shrinkage**: `(140 - final) / 140 * 100` — matches `calculateLinearShrinkage`
- **PI**: `LL - PL` — matches `calculatePlasticityIndex`
- **Modulus of Plasticity**: `PI * passing425um / 100` — the Excel shows 3761 for PI=42.45, passing=88.6 → 42.45×88.6=3761.07. This matches but note: the formula is `PI * passing425um` (not divided by 100). Need to verify our implementation.

**Potential issue**: The Modulus of Plasticity formula. Excel shows `3761 = 42.45 * 88.6` (no division by 100). Our code may have `PI * passing425um / 100` which would give 37.61 instead.

### Changes

1. **TestSection.tsx**: Fix `onSave` return type to `() => void | boolean | Promise<void | boolean>`
2. **atterbergCalculations.ts**: Verify and fix Modulus of Plasticity formula — should be `PI * passing425um` (not `/ 100`)

