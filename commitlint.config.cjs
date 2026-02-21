module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // allow longer body lines to avoid CI failures on windows
    "body-max-line-length": [2, "always", 200],
  },
};
