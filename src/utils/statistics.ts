/**
 * Statistical analysis module for educational research & study evaluation.
 * Computes descriptive statistics, inferential tests (Paired & Welch t-tests),
 * effect sizes (Cohen's d, Hedges' g), and 95% confidence intervals with exact p-values
 * computed via the regularized incomplete beta function.
 */

/**
 * Lanczos approximation for log-gamma ln(Γ(z))
 */
export function logGamma(z: number): number {
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j <= 5; j++) {
    y += 1;
    ser += c[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/**
 * Continued fraction evaluation for regularized incomplete beta function (Lentz's method)
 */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 3.0e-12;
  const FPMIN = 1.0e-30;

  const qab = a + b;
  const qap = a + 1.0;
  const qam = a - 1.0;
  let c = 1.0;
  let d = 1.0 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1.0 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    h *= d * c;

    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1.0 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1.0 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < EPS) break;
  }
  return h;
}

/**
 * Regularized incomplete beta function I_x(a, b)
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) {
    throw new Error(`x must be in [0, 1], received ${x}`);
  }
  if (x === 0) return 0;
  if (x === 1) return 1;

  // Use symmetry relation if x > (a + 1)/(a + b + 2)
  if (x > (a + 1.0) / (a + b + 2.0)) {
    return 1.0 - regularizedIncompleteBeta(1.0 - x, b, a);
  }

  const logFactor =
    logGamma(a + b) -
    logGamma(a) -
    logGamma(b) +
    a * Math.log(x) +
    b * Math.log(1.0 - x);
  const factor = Math.exp(logFactor);
  return (factor * betacf(a, b, x)) / a;
}

/**
 * Two-tailed p-value for Student's t distribution with degrees of freedom df
 */
export function tToTwoTailedP(t: number, df: number): number {
  if (df <= 0) return 1;
  const absT = Math.abs(t);
  if (absT === 0) return 1;
  const x = df / (df + absT * absT);
  const p = regularizedIncompleteBeta(x, df / 2, 0.5);
  return Math.min(1, Math.max(0, p));
}

/**
 * Compute critical value t_crit for two-tailed alpha=0.05 (95% CI)
 */
export function getCriticalT95(df: number): number {
  if (df <= 0) return 1.96;
  if (df === 1) return 12.706;
  if (df === 2) return 4.303;
  if (df === 9) return 2.262;

  // Binary search for t such that tToTwoTailedP(t, df) === 0.05
  let low = 1.95;
  let high = 15.0;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const p = tToTwoTailedP(mid, df);
    if (p > 0.05) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Number(((low + high) / 2).toFixed(4));
}

/**
 * Arithmetic Mean
 */
export function calculateMean(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

/**
 * Sample Variance (n-1 degrees of freedom)
 */
export function calculateVariance(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const mean = calculateMean(values);
  const sumSq = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  return sumSq / (values.length - 1);
}

/**
 * Sample Standard Deviation
 */
export function calculateSD(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * Standard Error of the Mean
 */
export function calculateSEM(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  return calculateSD(values) / Math.sqrt(values.length);
}

/**
 * 95% Confidence Interval for the mean: [lower, upper]
 */
export function calculate95CI(values: number[]): [number, number] {
  if (!values || values.length === 0) return [0, 0];
  const mean = calculateMean(values);
  if (values.length === 1) return [mean, mean];

  const df = values.length - 1;
  const tCrit = getCriticalT95(df);
  const sem = calculateSEM(values);
  const margin = tCrit * sem;
  return [Number((mean - margin).toFixed(2)), Number((mean + margin).toFixed(2))];
}

export interface PairedTTestResult {
  meanDiff: number;
  sdDiff: number;
  t: number;
  df: number;
  pValue: number;
  ci95: [number, number];
  isSignificant: boolean;
}

/**
 * Paired t-test (e.g. Pre-test vs Post-test within same arm)
 */
export function calculatePairedTTest(pre: number[], post: number[]): PairedTTestResult {
  const n = Math.min(pre.length, post.length);
  if (n < 2) {
    return {
      meanDiff: 0,
      sdDiff: 0,
      t: 0,
      df: 1,
      pValue: 1,
      ci95: [0, 0],
      isSignificant: false,
    };
  }

  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push(post[i] - pre[i]);
  }

  const meanDiff = calculateMean(diffs);
  const sdDiff = calculateSD(diffs);
  const se = sdDiff / Math.sqrt(n);
  const df = n - 1;
  const t = se === 0 ? 0 : meanDiff / se;
  const pValue = tToTwoTailedP(t, df);
  const tCrit = getCriticalT95(df);
  const margin = tCrit * se;

  return {
    meanDiff: Number(meanDiff.toFixed(2)),
    sdDiff: Number(sdDiff.toFixed(2)),
    t: Number(t.toFixed(4)),
    df,
    pValue: Number(pValue.toFixed(5)),
    ci95: [Number((meanDiff - margin).toFixed(2)), Number((meanDiff + margin).toFixed(2))],
    isSignificant: pValue < 0.05,
  };
}

export interface WelchTTestResult {
  meanA: number;
  meanB: number;
  meanDiff: number;
  t: number;
  df: number;
  pValue: number;
  ci95: [number, number];
  isSignificant: boolean;
}

/**
 * Welch's Two-Sample t-test (unequal variances and sample sizes)
 */
export function calculateWelchTTest(groupA: number[], groupB: number[]): WelchTTestResult {
  const nA = groupA.length;
  const nB = groupB.length;
  if (nA < 2 || nB < 2) {
    return {
      meanA: calculateMean(groupA),
      meanB: calculateMean(groupB),
      meanDiff: 0,
      t: 0,
      df: 1,
      pValue: 1,
      ci95: [0, 0],
      isSignificant: false,
    };
  }

  const meanA = calculateMean(groupA);
  const meanB = calculateMean(groupB);
  const varA = calculateVariance(groupA);
  const varB = calculateVariance(groupB);

  const seA = varA / nA;
  const seB = varB / nB;
  const seDiff = Math.sqrt(seA + seB);

  const meanDiff = meanA - meanB;
  const t = seDiff === 0 ? 0 : meanDiff / seDiff;

  // Welch-Satterthwaite equation for degrees of freedom
  const numerator = Math.pow(seA + seB, 2);
  const denominator = Math.pow(seA, 2) / (nA - 1) + Math.pow(seB, 2) / (nB - 1);
  const df = denominator === 0 ? 1 : Math.round(numerator / denominator);

  const pValue = tToTwoTailedP(t, df);
  const tCrit = getCriticalT95(df);
  const margin = tCrit * seDiff;

  return {
    meanA: Number(meanA.toFixed(2)),
    meanB: Number(meanB.toFixed(2)),
    meanDiff: Number(meanDiff.toFixed(2)),
    t: Number(t.toFixed(4)),
    df,
    pValue: Number(pValue.toFixed(5)),
    ci95: [Number((meanDiff - margin).toFixed(2)), Number((meanDiff + margin).toFixed(2))],
    isSignificant: pValue < 0.05,
  };
}

/**
 * Cohen's d effect size between two independent groups
 */
export function calculateCohensD(groupA: number[], groupB: number[]): number {
  const nA = groupA.length;
  const nB = groupB.length;
  if (nA < 2 || nB < 2) return 0;

  const meanA = calculateMean(groupA);
  const meanB = calculateMean(groupB);
  const varA = calculateVariance(groupA);
  const varB = calculateVariance(groupB);

  // Pooled standard deviation
  const pooledVar = ((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2);
  const pooledSD = Math.sqrt(pooledVar);

  if (pooledSD === 0) return 0;
  return Number(((meanA - meanB) / pooledSD).toFixed(3));
}

/**
 * Hedges' g (Cohen's d with small-sample correction factor J)
 */
export function calculateHedgesG(groupA: number[], groupB: number[]): number {
  const d = calculateCohensD(groupA, groupB);
  const df = groupA.length + groupB.length - 2;
  if (df <= 0) return d;
  // Correction factor J(df) = 1 - 3 / (4 * df - 1)
  const j = 1 - 3 / (4 * df - 1);
  return Number((d * j).toFixed(3));
}

/**
 * Hake's Normalized Learning Gain g = (post - pre) / (100 - pre)
 */
export function calculateNormalizedGain(pre: number, post: number): number {
  if (pre >= 100) return post >= 100 ? 1 : 0;
  const gain = (post - pre) / (100 - pre);
  return Number(Math.max(-1, Math.min(1, gain)).toFixed(3));
}
