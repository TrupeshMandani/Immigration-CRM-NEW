const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

const runWithAuthContext = async (authHeader, handler) => {
  return storage.run({ authHeader }, handler);
};

const getAuthHeader = () => {
  return storage.getStore()?.authHeader || null;
};

module.exports = {
  runWithAuthContext,
  getAuthHeader,
};
