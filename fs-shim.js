// Empty shim for Node's fs module.
// Required because @arcium-hq/client imports fs but only uses it
// for circuit file operations, not for the crypto primitives we need.
module.exports = {};
