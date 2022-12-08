const { ethers } = require('hardhat');
// eslint-disable-next-line node/no-unpublished-require
const { mergeABIs } = require('hardhat-deploy/dist/src/utils');
const { provider, utils } = ethers;
/**
 * @param  {} contractAddress
 * @description get implementation contract address from a UUPS proxy contract
 */
async function getImplementationAddress (contractAddress) {
  const EIP1967_STORAGE_SLOT = utils.hexlify(
    ethers.BigNumber.from(utils.id('eip1967.proxy.implementation')).sub(1));

  return utils.getAddress(
    utils.hexZeroPad(
      utils.hexStripZeros(
        await provider.getStorageAt(contractAddress, EIP1967_STORAGE_SLOT),
      ), 20),
  );
}
/**
 * @param  {} proxyContractABI
 * @param  {} contractABI
 * @description merge proxyContractABI and contractABI, which used to create a new deployed proxy abi
 */
function getProxiedABI (proxyContractABI, contractABI) {
  const mergedABI = mergeABIs([proxyContractABI, contractABI], {
    check: true,
    skipSupportsInterface: true,
  }).filter((v) => v.type !== 'constructor');

  const proxyContractConstructor = proxyContractABI.find(
    (v) => v.type === 'constructor',
  );

  mergedABI.push(proxyContractConstructor); // use proxy constructor abi
  return mergedABI;
}
module.exports = {
  getImplementationAddress, getProxiedABI,
};
