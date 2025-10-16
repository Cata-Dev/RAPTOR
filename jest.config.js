const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text", "lcov", "json-summary"],
  // Using https://jestjs.io/docs/configuration#rootdir-string
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
