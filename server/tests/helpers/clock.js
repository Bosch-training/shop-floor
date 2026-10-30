// Fake only Date so Supertest I/O and timers keep working.
const REAL_TIMERS = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
];

function freezeClock(iso) {
  jest.useFakeTimers({ doNotFake: REAL_TIMERS, now: new Date(iso) });
}

function setClock(iso) {
  jest.setSystemTime(new Date(iso));
}

function restoreClock() {
  jest.useRealTimers();
}

module.exports = { freezeClock, setClock, restoreClock };
