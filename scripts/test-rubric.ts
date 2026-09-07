import assert from 'node:assert/strict';
import { normalizeRubricWeights } from '../lib/interview/report';

assert.deepEqual(normalizeRubricWeights({ technicalAccuracy: 30, communication: 30, problemSolving: 0, coding: 40 }, true), {
  technicalAccuracy: 30, communication: 30, problemSolving: 0, coding: 40,
});
assert.deepEqual(normalizeRubricWeights({ technicalAccuracy: -4, communication: 200, problemSolving: Number.NaN, coding: 3 }, false), {
  technicalAccuracy: 0, communication: 100, problemSolving: 25, coding: 3,
});
assert.deepEqual(normalizeRubricWeights({ technicalAccuracy: 0, communication: 0, problemSolving: 0, coding: 0 }, false), {
  technicalAccuracy: 45, communication: 30, problemSolving: 25, coding: 0,
});
console.log('Rubric normalization tests passed.');
