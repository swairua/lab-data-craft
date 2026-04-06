import { describe, it, expect } from "vitest";
import {
  calculateMoistureFromMass,
  calculateLiquidLimit,
  calculatePlasticLimit,
  calculatePlasticityIndex,
  calculateLinearShrinkage,
  calculateModulusOfPlasticity,
} from "@/lib/atterbergCalculations";
import type { LiquidLimitTrial, PlasticLimitTrial, ShrinkageLimitTrial } from "@/context/TestDataContext";

const makeLLTrial = (i: number, pen: string, wet: string, dry: string, cont: string): LiquidLimitTrial => ({
  id: `ll-${i}`,
  trialNo: String(i),
  penetration: pen,
  moisture: calculateMoistureFromMass(wet, dry, cont) || "0",
  containerNo: `C${i}`,
  containerWetMass: wet,
  containerDryMass: dry,
  containerMass: cont,
});

const makePLTrial = (i: number, wet: string, dry: string, cont: string): PlasticLimitTrial => ({
  id: `pl-${i}`,
  trialNo: String(i),
  moisture: calculateMoistureFromMass(wet, dry, cont) || "0",
  containerNo: `P${i}`,
  containerWetMass: wet,
  containerDryMass: dry,
  containerMass: cont,
});

// Excel data from Copy_of_Master_ATT-2.xlsx
const llTrials: LiquidLimitTrial[] = [
  makeLLTrial(1, "15.2", "53.86", "42.72", "15.05"),
  makeLLTrial(2, "17.8", "48.63", "38.93", "14.8"),
  makeLLTrial(3, "22.2", "36.07", "28.42", "11.12"),
  makeLLTrial(4, "25.1", "46.29", "35.69", "12.43"),
];

const plTrialData: PlasticLimitTrial[] = [
  makePLTrial(1, "19.17", "17.93", "12.22"),
  makePLTrial(2, "20.83", "19.48", "12.96"),
];

describe("Excel verification", () => {
  it("calculates moisture correctly for each LL trial", () => {
    expect(Number(calculateMoistureFromMass("53.86", "42.72", "15.05"))).toBeCloseTo(40.26, 1);
    expect(Number(calculateMoistureFromMass("48.63", "38.93", "14.8"))).toBeCloseTo(40.2, 1);
    expect(Number(calculateMoistureFromMass("36.07", "28.42", "11.12"))).toBeCloseTo(44.22, 1);
    expect(Number(calculateMoistureFromMass("46.29", "35.69", "12.43"))).toBeCloseTo(45.57, 1);
  });

  it("interpolates LL at 20mm penetration", () => {
    const ll = calculateLiquidLimit(llTrials);
    expect(ll).not.toBeNull();
    console.log("Calculated LL:", ll);
    // Excel LL ≈ 42.7
    expect(ll!).toBeCloseTo(42.7, 0);
  });

  it("calculates PL correctly", () => {
    const pl = calculatePlasticLimit(plTrialData);
    expect(pl).not.toBeNull();
    console.log("Calculated PL:", pl);
    // Trial1: 21.72, Trial2: 20.71, Avg ≈ 21.22
    expect(pl!).toBeCloseTo(21.22, 0);
  });

  it("calculates PI correctly", () => {
    const ll = calculateLiquidLimit(llTrials);
    const pl = calculatePlasticLimit(plTrialData);
    const pi = calculatePlasticityIndex(ll, pl);
    console.log("PI:", pi, "LL:", ll, "PL:", pl);
    expect(pi).not.toBeNull();
  });

  it("calculates linear shrinkage", () => {
    const trials: ShrinkageLimitTrial[] = [{
      id: "s1", trialNo: "1", initialLength: "140", finalLength: "120.5",
    }];
    const ls = calculateLinearShrinkage(trials);
    expect(ls).not.toBeNull();
    expect(ls!).toBeCloseTo(13.93, 1);
    console.log("Linear Shrinkage:", ls);
  });

  it("calculates Modulus of Plasticity = PI * passing425 (no /100)", () => {
    const mop = calculateModulusOfPlasticity(42.45, "88.6");
    expect(mop).toBeCloseTo(3761.07, 0);
    console.log("Modulus of Plasticity:", mop);
  });
});
