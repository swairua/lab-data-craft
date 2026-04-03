

# Audit: Align Atterberg Test with Master Excel (BS 1377 Part 2, 4.3:1990)

## Key Findings

The uploaded Excel uses the **BS 1377 Cone Penetration method**, which differs from the current implementation in several critical ways:

### Major Discrepancies

1. **Liquid Limit method is wrong**: The Excel uses **penetration depth (mm)** with interpolation at **20mm**, not Casagrande blows at 25. The current code interpolates at 25 blows.

2. **Moisture is calculated from mass measurements, not entered directly**: The Excel expects raw mass inputs (Container+Wet Soil, Container+Dry Soil, Container weight) and auto-calculates:
   - Wt of Moisture = (Container+Wet) - (Container+Dry)
   - Wt of Dry Soil = (Container+Dry) - Container
   - Moisture % = (Moisture / Dry Soil) × 100

3. **Container Number**: Each trial has a container ID (e.g., "TR", "DF", "SD").

4. **Linear Shrinkage is the primary method**: Uses a standard mould of 140mm initial length. Shrinkage % = ((Initial - Final) / Initial) × 100. No volumetric method.

5. **Missing derived values**: Modulus of Plasticity (= PI × % passing 425µm ÷ 100, used as "3761" in the Excel which seems like PI × passing425), Passing 425µm sieve %.

6. **Missing AASHTO classification** alongside USCS.

7. **Missing metadata fields**: Sampled/submitted by, Sample ID, Sample depth, Sample No, Date submitted, Date tested, Date reported, Tested by, Checked by.

### Build Errors (must also fix)

The test files have numerous type errors from prior refactoring. These need fixing alongside the audit changes.

---

## Plan

### 1. Update data model (TestDataContext.tsx)
- **LiquidLimitTrial**: rename `blows` to `penetration`; add `containerNo`; change mass fields to `containerWetMass`, `containerDryMass`, `containerMass` (the three raw inputs); keep computed `moisture` as auto-calculated
- **PlasticLimitTrial**: add `containerNo`, `containerWetMass`, `containerDryMass`, `containerMass`; moisture becomes auto-calculated
- **ShrinkageLimitTrial**: simplify to `initialLength` and `finalLength` (both in mm) for linear shrinkage only; remove volumetric fields and `method` toggle
- **CalculatedResults**: add `linearShrinkage`, `modulusOfPlasticity`, `passing425um` fields
- **AtterbergRecord**: add metadata fields (`sampledBy`, `sampleId`, `sampleDepth`, `sampleNo`, `dateSubmitted`, `dateTested`, `dateReported`, `testedBy`, `checkedBy`)
- Remove `method` from ShrinkageLimitTest (linear only)

### 2. Update calculation engine (atterbergCalculations.ts)
- **Moisture from mass**: `moisture = ((containerWetMass - containerDryMass) / (containerDryMass - containerMass)) × 100`
- **Liquid Limit**: interpolate at **20mm penetration** (not 25 blows); use log-linear interpolation per BS 1377 (log penetration vs moisture, or linear interpolation)
- **Plastic Limit**: average of moisture values (unchanged logic, but moisture now auto-calculated from mass)
- **Linear Shrinkage**: `((initialLength - finalLength) / initialLength) × 100`; remove volumetric shrinkage functions
- **Modulus of Plasticity**: `PI × passing425um / 100` (when passing425um is provided)
- Update all validation functions for new field names

### 3. Update UI components
- **LiquidLimitSection**: table columns become Container No | Penetration (mm) | Wt Container+Wet (g) | Wt Container+Dry (g) | Wt Container (g) | Wt Moisture (g) [calculated] | Wt Dry Soil (g) [calculated] | Moisture % [calculated]. Graph becomes Penetration vs Moisture with reference line at 20mm.
- **PlasticLimitSection**: same mass-based columns (Container No, Wt Container+Wet, Wt Container+Dry, Wt Container, calculated moisture). Default 2 trials.
- **ShrinkageLimitSection**: simplify to Initial Length (mm) [default 140] and Final Length (mm); remove method toggle; single shrinkage % output.
- **AtterbergTestCard**: add Passing 425µm input field at record level; display Modulus of Plasticity in results.
- **AtterbergTest**: add metadata input fields (client, project, sampled by, sample ID, depth, dates, tested/checked by).

### 4. Update summary and results display
- Show: LL%, PL%, PI%, Linear Shrinkage%, Modulus of Plasticity, USCS classification, AASHTO classification
- Add AASHTO classification logic to `soilClassification.ts`

### 5. Fix all build errors in test files
- `AtterbergTest.test.tsx`: rename import alias to avoid duplicate identifier
- `edgeCaseTests.test.ts`: remove imports of non-exported `classifyFineGrained`/`classifyFineGrainedPublic`; remove `method` from test types; fix `calculateShrinkageLimit` call signature; add `note` to AtterbergRecord objects
- `example.test.ts`: fix helper functions to return specific union types instead of generic `AtterbergTest`
- `jsonExporter.test.ts`: update `blows` references to `penetration`
- `metadataExport.test.ts`: fix property name mismatches

### 6. Update exporters
- `pdfGenerator.ts` and `csvExporter.ts`: update field names and include new fields (container no, mass measurements, AASHTO, modulus of plasticity)
- `reportGenerator.ts`: update report format to match Excel layout

## Technical Details

**Moisture calculation formula** (per BS 1377):
```text
Wt of Moisture = (Wt Container+Wet) - (Wt Container+Dry)
Wt of Dry Soil = (Wt Container+Dry) - (Wt Container)
Moisture Content (%) = (Wt of Moisture / Wt of Dry Soil) × 100
```

**Liquid Limit interpolation** (cone penetration at 20mm):
```text
LL = moisture at 20mm penetration, interpolated from trial data
Using linear interpolation between bracketing points
```

**Files to modify**: `TestDataContext.tsx`, `atterbergCalculations.ts`, `LiquidLimitSection.tsx`, `PlasticLimitSection.tsx`, `ShrinkageLimitSection.tsx`, `AtterbergTestCard.tsx`, `AtterbergTest.tsx`, `soilClassification.ts`, `pdfGenerator.ts`, `csvExporter.ts`, `reportGenerator.ts`, and all 5 test files.

