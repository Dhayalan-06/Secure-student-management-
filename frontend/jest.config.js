export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.[jt]sx?$': [
      'ts-jest',
      { tsconfig: { allowJs: true, jsx: 'react-jsx', module: 'CommonJS', moduleResolution: 'node' } },
    ],
  },
};
