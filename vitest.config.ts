import { defineConfig } from 'vitest/config';

/**
 * One environment for everything.
 *
 * The engine tests are pure computation and would run marginally faster in
 * node, but splitting environments needs a workspace and two setup files, and
 * the whole suite still finishes in seconds under jsdom. Simpler wins.
 *
 * @vitejs/plugin-react is deliberately NOT used here. Its job is Fast Refresh,
 * which means nothing in a test run, and esbuild already compiles JSX from the
 * `jsx: "react-jsx"` setting in tsconfig. Including it only introduced a type
 * conflict between two copies of vite's Plugin type.
 */
export default defineConfig({
  test: {
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
