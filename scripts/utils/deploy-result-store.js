const fs = require('fs');

/**
 * @typedef {Object} DeployResult
 * @property {number} block_number Deployment Block Number
 * @property {object} addresses Deployment Addresses
 * @property {string} addresses.adam
 * @property {string} addresses.dao
 * @property {string} addresses.membership
 * @property {string} addresses.multiToken
 * @property {string} addresses.governFactory
 * @property {string} addresses.govern
 * @property {string} addresses.transferErc20BudgetApproval
 * @property {string} addresses.uniswapBudgetApproval
 * @property {object} initdata_addresses
 * @property {string} initdata_addresses.daoLockTime0
 * @property {string} initdata_addresses.daoLockTime100A
 * @property {string} initdata_addresses.daoLockTime100B
 * @property {string} initdata_addresses.daoLockTime100C
 * @property {string} initdata_addresses.governDaoLockTime0
 * @property {string} initdata_addresses.transferErc20ApprovalDaoLockTime0
 * @property {string} initdata_addresses.uniswapApprovalDaoLockTime0
 */

/**
 * @returns {DeployResult}
 */
function load () {
  return JSON.parse(fs.readFileSync('deploy/results.json', 'utf8'));
};

/**
 * @param {DeployResult} results
 */
function save (results) {
  if (!fs.existsSync('deploy')) {
    fs.mkdirSync('deploy');
  }
  fs.writeFileSync('deploy/results.json', JSON.stringify(results));
};

module.exports = {
  save, load,
};
