const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text", "lcov", "json-summary"],
  testMatch: ["**/test/**/*.test.ts"],
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
