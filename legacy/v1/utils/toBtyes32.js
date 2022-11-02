const { ethers } = require('hardhat');

module.exports = (text) => {
  let result = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(text));
  while (result.length < 66) { result += '0'; }
  if (result.length !== 66) { throw new Error('invalid web3 implicit bytes32'); }
  return result;
};
