// Enable BigInt JSON serialization for Jest worker communication
// Without this, tests using BigInt fail with "Do not know how to serialize a BigInt"
// when Jest sends results between worker processes via JSON.stringify
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};
