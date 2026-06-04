/** @worldcup/shared — types, schemas, constants, formatters, standings, selectors. */
export * from './constants.js';
export * from './schemas.js';
export * from './types.js';
export * from './formatters.js';
export * from './standings.js';
export * from './selectors.js';
export * from './applyResults.js';
export * from './liveOverlay.js';
export * from './resultsMapping.js';
export * from './auditLog.js';
export * as mock from './dataset/index.js';
// Backward-compatible alias — prefer `mock` or direct `./dataset` import.
export * as dataset from './dataset/index.js';
