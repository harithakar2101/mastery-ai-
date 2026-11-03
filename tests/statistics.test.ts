import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMean,
  calculateVariance,
  calculateSD,
  calculate95CI,
  calculatePairedTTest,
  calculateWelchTTest,
  calculateCohensD,
  calculateHedgesG,
  calculateNormalizedGain,
  tToTwoTailedP,
  getCriticalT95,
  regularizedIncompleteBeta,
} from '../src/utils/statistics.ts';

describe('Statistical Analysis & Evaluation Suite', () => {
  it('computes arithmetic mean accurately', () => {
    const data = [10, 20, 30, 40, 50];
    assert.equal(calculateMean(data), 30);
    assert.equal(calculateMean([]), 0);
  });

  it('computes sample variance and sample standard deviation', () => {
    // Data: [2, 4, 4, 4, 5, 5, 7, 9], sum=40, n=8, mean=5
    // deviations: -3, -1, -1, -1, 0, 0, +2, +4
    // squared: 9, 1, 1, 1, 0, 0, 4, 16 => sum=32
    // sample var = 32 / (8 - 1) = 32 / 7 ≈ 4.5714
    // sample SD = sqrt(32/7) ≈ 2.138
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const variance = calculateVariance(data);
    const sd = calculateSD(data);
    assert.ok(Math.abs(variance - 32 / 7) < 0.0001);
    assert.ok(Math.abs(sd - Math.sqrt(32 / 7)) < 0.0001);
  });

  it('computes two-sided p-value from t distribution via regularized incomplete beta: t=2.262, df=9 gives two-sided p of about 0.05', () => {
    const t = 2.262;
    const df = 9;
    const p = tToTwoTailedP(t, df);
    // Verified: p ≈ 0.050017
    assert.ok(
      Math.abs(p - 0.05) < 0.005,
      `Expected p ≈ 0.05, but received ${p}`
    );
  });

  it('determines critical t value for 95% CI (df=9 gives 2.262)', () => {
    const tCrit = getCriticalT95(9);
    assert.equal(tCrit, 2.262);
  });

  it('computes paired t-test for pre vs post scores within an arm', () => {
    const pre = [40, 45, 50, 35, 60, 55, 42, 48, 52, 38];
    const post = [80, 85, 90, 75, 99, 94, 82, 88, 92, 78]; // meanDiff ≈ 39.9
    const result = calculatePairedTTest(pre, post);

    assert.ok(result.meanDiff > 35 && result.meanDiff < 45);
    assert.equal(result.df, 9);
    assert.ok(result.pValue < 0.001);
    assert.equal(result.isSignificant, true);
  });

  it('computes Welch t-test for two independent arms with unequal variances', () => {
    const armA = [85, 88, 92, 90, 95, 86, 91, 89, 94, 90]; // Personalised (mean ~90)
    const armB = [55, 60, 58, 62, 59, 65, 54, 61, 57, 63]; // Generic (mean ~59.4)

    const result = calculateWelchTTest(armA, armB);
    assert.ok(result.meanA > result.meanB);
    assert.ok(result.meanDiff > 25);
    assert.ok(result.pValue < 0.0001);
    assert.equal(result.isSignificant, true);
    assert.ok(result.ci95[0] > 0);
  });

  it('computes Cohen d and Hedges g effect sizes', () => {
    const armA = [85, 88, 92, 90, 95, 86, 91, 89, 94, 90];
    const armB = [65, 70, 68, 72, 69, 75, 64, 71, 67, 73];

    const d = calculateCohensD(armA, armB);
    const g = calculateHedgesG(armA, armB);

    assert.ok(d > 2.0, `Expected large effect size d > 2.0, got ${d}`);
    assert.ok(g > 0 && g <= d, `Hedges g should apply small-sample correction factor J <= 1: ${g} <= ${d}`);
  });

  it('calculates Hakes normalized learning gain correctly', () => {
    // Normal case: pre 40, post 70 => (70-40)/(100-40) = 30/60 = 0.50
    assert.equal(calculateNormalizedGain(40, 70), 0.5);

    // Full mastery: pre 50, post 100 => 50/50 = 1.00
    assert.equal(calculateNormalizedGain(50, 100), 1.0);

    // Negative gain / regression: pre 60, post 45 => -15/40 = -0.375
    assert.equal(calculateNormalizedGain(60, 45), -0.375);
  });
});
