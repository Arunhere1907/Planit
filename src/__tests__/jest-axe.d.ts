import 'vitest';
import type { AxeResults } from 'jest-axe';

declare module 'vitest' {
  interface Assertion<T> {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
