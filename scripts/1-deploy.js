// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

async function main () {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const ToString = await hre.ethers.getContractFactory('ToString');
  const toString = await ToString.deploy();
  await toString.deployed();

  const libraries = {
    ToString: toString.address,
  };

  const AssetManagerFactory = await hre.ethers.getContractFactory('AssetManagerFactory', { libraries });
  const StrategyFactory = await hre.ethers.getContractFactory('StrategyFactory', { libraries });
  const Adam = await hre.ethers.getContractFactory('Adam');

  const assetManagerFactory = await AssetManagerFactory.deploy();
  const strategyFactory = await StrategyFactory.deploy();

  await strategyFactory.deployed();
  await assetManagerFactory.deployed();

  const adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
  await adam.deployed();

  // const assetManager = await AssetManager.deploy("AM Ltd");

  // await assetManager.deployed();

  console.log('assetManagerFactory deployed to: ', assetManagerFactory.address);
  console.log('strategyFactory deployed to: ', strategyFactory.address);

  console.log('adam deployed to: ', adam.address);

  await hre.run('verify:verify', {
    address: adam.address,
    constructorArguments: [
      assetManagerFactory.address,
      strategyFactory.address,
    ],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
