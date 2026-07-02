/** jest-expo runs React Native component tests (ADR-0008). The pure engine
 * layer is tested by Vitest in Node instead — kept out of this matcher. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.tsx'],
};
