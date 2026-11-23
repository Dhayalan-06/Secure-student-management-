export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.[jt]sx?$': [
      'ts-jest',
      { tsconfig: { allowJs: true, jsx: 'react-jsx', module: 'CommonJS', moduleResolution: 'node' } },
    ],
  },
};
