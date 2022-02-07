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
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const AssetManagerFactory = await hre.ethers.getContractFactory('AssetManagerFactory');
  const StrategyFactory = await hre.ethers.getContractFactory('StrategyFactory');
  const Adam = await hre.ethers.getContractFactory('Adam');

  const assetManagerFactory = await hre.upgrades.deployProxy(AssetManagerFactory, [], { kind: 'uups' });
  const strategyFactory = await hre.upgrades.deployProxy(StrategyFactory, [], { kind: 'uups' });

  await strategyFactory.deployed();
  await assetManagerFactory.deployed();

  const adam = await hre.upgrades.deployProxy(Adam, [assetManagerFactory.address, strategyFactory.address], { kind: 'uups' });
  await adam.deployed();

  console.log('assetManagerFactory deployed to: ', assetManagerFactory.address);
  console.log('strategyFactory deployed to: ', strategyFactory.address);
  console.log('adam deployed to: ', adam.address);

  const PriceConverter = await hre.ethers.getContractFactory('PriceConverter');
  const priceConverter = await PriceConverter.deploy();
  await priceConverter.deployed();

  const Treasury = await hre.ethers.getContractFactory('TestTreasury');
  const treasury = await Treasury.deploy(
      adam.address,
      priceConverter.address,
  );
  await treasury.deployed();

  console.log('priceConverter deployed to: ', priceConverter.address);
  console.log('treasury deployed to: ', treasury.address);

  await delay(20000);

  await hre.run('verify:verify', {
    address: priceConverter.address,
  });

  await hre.run('verify:verify', {
      address: treasury.address,
      constructorArguments: [
      adam.address,
      priceConverter.address,
      ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});