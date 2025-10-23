// Global test setup. Keep it minimal to avoid side-effects.
// - You can extend this for shared mocks or polyfills as needed.

// Ensure unhandled rejections fail tests loudly in Node env tests.
process.on('unhandledRejection', (err) => {
  // Vitest reports these by default, but we keep this to be explicit.
  console.error('UnhandledRejection in tests:', err)
})
