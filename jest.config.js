const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text", "lcov", "json-summary"],
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
