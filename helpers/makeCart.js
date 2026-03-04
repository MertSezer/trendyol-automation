'use strict';

/**
 * Cart utilities factory.
 * Standard export: named export { makeCart }.
 * Usage: const { makeCart } = require('./helpers/makeCart');
 */
function makeCart() {
  return {
    // Placeholders - expand as needed
    createdAt: new Date().toISOString(),
  };
}

module.exports = { makeCart };
