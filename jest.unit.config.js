const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.json')

const moduleNameMapper = pathsToModuleNameMapper(compilerOptions.paths || {}, {
  prefix: '<rootDir>/',
})

module.exports = {
  displayName: 'root',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__', '<rootDir>/apps'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/apps/mobile/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFiles: ['<rootDir>/apps/web/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/apps/web/jest.setup.cjs'],
  moduleNameMapper: {
    ...moduleNameMapper,
    '\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        diagnostics: {
          ignoreCodes: [2339],
        },
      },
    ],
  },
}
