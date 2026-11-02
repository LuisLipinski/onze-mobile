const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const ReactNativeEnvironment = require(require('jest-expo/jest-preset').testEnvironment);

module.exports = class ComponentEnvironment extends ReactNativeEnvironment {
  constructor(config, context) {
    super(config, context);
    this.testPath = context.testPath;
  }
  async teardown() {
    if (process.env.ONZE_COVERAGE_RAW && this.global.__coverage__) {
      const id = createHash('sha256').update(this.testPath).digest('hex');
      writeFileSync(
        join(process.env.ONZE_COVERAGE_RAW, `component-${process.pid}-${id}.json`),
        JSON.stringify(this.global.__coverage__),
      );
    }
    await super.teardown();
  }
};
