const { ethers } = require('ethers');

const abi = require('../artifacts/contracts/Adam.sol/Adam.json').abi;

// rinkeby

async function main () {
  const iface = new ethers.utils.Interface(abi);
  console.log(iface.format(ethers.utils.FormatTypes.full));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
