// Stub for Node.js vm module in browser environment
export default {};

// Provide empty implementations for common vm methods
export const Script = function() {
  throw new Error('vm.Script is not supported in browser environment');
};

export const createContext = function() {
  return {};
};

export const runInContext = function() {
  throw new Error('vm.runInContext is not supported in browser environment');
};