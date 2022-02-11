// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

function delay(t, val) {
  return new Promise(function(resolve) {
      setTimeout(function() {
          resolve(val);
      }, t);
  });
}

async function main () {
    const AssetManager = await hre.ethers.getContractFactory('AssetManager');
    const Strategy = await hre.ethers.getContractFactory('Strategy');
    const Adam = await hre.ethers.getContractFactory('Adam');

    const assetManager = await AssetManager.deploy();
    await assetManager.deployed();
    const strategy = await Strategy.deploy();
    await strategy.deployed();

    adam = await hre.upgrades.deployProxy(Adam, [assetManager.address, strategy.address], { kind: 'uups' });
    await adam.deployed();

    const PriceConverter = await hre.ethers.getContractFactory('PriceConverter');
    const priceConverter = await PriceConverter.deploy();
    await priceConverter.deployed();

    const Treasury = await hre.ethers.getContractFactory('Treasury');
    treasury = await hre.upgrades.deployProxy(Treasury, [adam.address, priceConverter.address]);
    await treasury.deployed();

    console.log('assetManager deployed to: ', assetManager.address);
    console.log('strategy deployed to: ', strategy.address);
    console.log('adam deployed to: ', adam.address);
    console.log('price converter deployed to: ', priceConverter.address);
    console.log('treasury deployed to: ', treasury.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});