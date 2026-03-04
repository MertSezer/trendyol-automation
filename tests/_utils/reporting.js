'use strict';

const { container } = require('codeceptjs');

function getCaseReport() {
  try { return container.helpers('CaseReport'); } catch (e) { return null; }
}

module.exports = { getCaseReport };
