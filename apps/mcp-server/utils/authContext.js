const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

/**
 * @param {string | null} authHeader
 * @param {string | null} firmId
 * @param {() => Promise<any>} handler
 */
const runWithAuthContext = async (authHeader, firmId, handler) => {
  return storage.run({ authHeader, firmId }, handler);
};

const getAuthHeader = () => {
  return storage.getStore()?.authHeader || null;
};

const getFirmId = () => {
  return storage.getStore()?.firmId || null;
};

module.exports = {
  runWithAuthContext,
  getAuthHeader,
  getFirmId,
};
