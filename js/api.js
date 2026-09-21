/**
 * Centralized Frontend API Client
 */

const Api = {
  /**
   * Generic GET request with JSON parsing
   * @param {string} endpoint
   * @returns {Promise<any>}
   */
  async get(endpoint) {
    try {
      const res = await fetch(endpoint);
      return await res.json();
    } catch (err) {
      console.error(`API GET error on ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * Generic POST request sending JSON payload
   * @param {string} endpoint
   * @param {object} payload
   * @returns {Promise<any>}
   */
  async post(endpoint, payload) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error(`API POST error on ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * POST request sending FormData (e.g. file upload)
   * @param {string} endpoint
   * @param {FormData} formData
   * @returns {Promise<any>}
   */
  async postFormData(endpoint, formData) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      return await res.json();
    } catch (err) {
      console.error(`API FormData POST error on ${endpoint}:`, err);
      throw err;
    }
  }
};

if (typeof window !== 'undefined') {
  window.Api = Api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Api;
}
