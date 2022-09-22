const { ethers } = require('hardhat');

module.exports = (functionSegment, params) => {
  const iface = new ethers.utils.Interface([`function ${functionSegment}`]);
  return iface.encodeFunctionData(functionSegment, params);
};
