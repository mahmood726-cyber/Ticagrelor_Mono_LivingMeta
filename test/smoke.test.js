/* smoke.test.js — minimal Node smoke test for the standalone pooling engine.
 *
 * Runs with plain Node (no test framework): `node test/smoke.test.js`.
 * Validates assets/vendor/pairwise-pool.js (window.PairwisePool) against
 * independently hand-computed reference values. Exits non-zero on any failure.
 *
 * Reference (RR, two trials):
 *   A: tE=10/tN=100, cE=20/cN=100 -> logRR = ln(0.5)  = -0.69315
 *   B: tE=15/tN=200, cE=25/cN=200 -> logRR = ln(0.6)  = -0.51083
 *   Q = 0.1467 < df(1) -> tau2 = 0, I2 = 0, pooled RR ~ 0.5551.
 */
'use strict';

require('../assets/vendor/pairwise-pool.js');
const P = globalThis.PairwisePool;

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log('  ok   - ' + name);
  } else {
    console.error('  FAIL - ' + name);
    failures++;
  }
}
function near(a, b, tol) { return isFinite(a) && Math.abs(a - b) <= (tol == null ? 1e-3 : tol); }

check('module exports pool2x2', P && typeof P.pool2x2 === 'function');

const trials = [
  { name: 'A', tE: 10, tN: 100, cE: 20, cN: 100 },
  { name: 'B', tE: 15, tN: 200, cE: 25, cN: 200 }
];
const r = P.pool2x2(trials, { measure: 'RR' });
check('k_used = 2', r.k_used === 2);
check('pooled RR ~ 0.5551', near(r.mu, 0.5551, 1e-3));
check('CI brackets point estimate', r.ci_lo < r.mu && r.mu < r.ci_hi);
check('tau2 = 0 (Q < df)', r.tau2 === 0);
check('I2 = 0', near(r.I2, 0, 1e-6));
check('df = k-1 = 1', r.df === 1);

// k=1 must fail closed, not silently pool a single study.
const r1 = P.pool2x2([trials[0]], { measure: 'RR' });
check('k=1 returns error', typeof r1.error === 'string' && r1.k_used < 2);

// Both-zero study is uninformative and must be dropped before pooling.
const rz = P.pool2x2([{ tE: 0, tN: 50, cE: 0, cN: 50 }, trials[0], trials[1]], { measure: 'OR' });
check('both-zero study excluded (k still 2)', rz.k_used === 2);
check('OR pool finite', isFinite(rz.mu) && rz.mu > 0);

if (failures) {
  console.error('\nSMOKE FAILED: ' + failures + ' assertion(s) failed.');
  process.exit(1);
}
console.log('\nSMOKE PASSED: all assertions ok.');
