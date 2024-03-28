const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
})

// Add any custom config to be passed to Jest
const config = {
    coverageProvider: 'v8',
    // original:
    // testEnvironment: 'jsdom',
    testEnvironment: 'node',
    testRegex: '(/__tests__/.*|(\\.|/)(mongodbtest))\\.[jt]sx?$',
    // test:
    // testEnvironment: './app/_tests/nodeEnvironment.js'
    // Add more setup options before each test is run
    // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    // "preset": "@shelf/jest-mongodb"
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)