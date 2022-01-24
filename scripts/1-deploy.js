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

//   const ToString = await hre.ethers.getContractFactory('ToString');
//   const toString = await ToString.deploy();
//   await toString.deployed();

//   const libraries = {
//     ToString: toString.address,
//   };

//   const AssetManagerFactory = await hre.ethers.getContractFactory('AssetManagerFactory', { libraries });
//   const StrategyFactory = await hre.ethers.getContractFactory('StrategyFactory', { libraries });
//   const Adam = await hre.ethers.getContractFactory('Adam');

//   const assetManagerFactory = await AssetManagerFactory.deploy();
//   const strategyFactory = await StrategyFactory.deploy();

//   await strategyFactory.deployed();
//   await assetManagerFactory.deployed();

//   const adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
//   await adam.deployed();

//   console.log('assetManagerFactory deployed to: ', assetManagerFactory.address);
//   console.log('strategyFactory deployed to: ', strategyFactory.address);
//   console.log('adam deployed to: ', adam.address);

//   const PriceConverter = await hre.ethers.getContractFactory('PriceConverter');
//   const priceConverter = await PriceConverter.deploy();
//   await priceConverter.deployed();

//   const Treasury = await hre.ethers.getContractFactory('TestTreasury');
//   const treasury = await Treasury.deploy(
//       adam.address,
//       priceConverter.address,
//     );
//   await treasury.deployed();

//   console.log('priceConverter deployed to: ', priceConverter.address);
//   console.log('treasury deployed to: ', treasury.address);

  await hre.run('verify:verify', {
    address: adam.address,
    constructorArguments: [
      assetManagerFactory.address,
      strategyFactory.address,
    ],
  });
  await hre.run('verify:verify', {
    address: assetManagerFactory.address,
  });
  await hre.run('verify:verify', {
    address: strategyFactory.address,
  });

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

async function main2() {
    // const Treasury = await hre.ethers.getContractFactory('TestTreasury');
    // const treasury = await Treasury.deploy(
    //       '0x825bD94275D1b47A5842238Ece90AaB910923311',
    //       '0xa011d8060c3AeDFD9305De114fF11082a3Dc8928',
    //   );
    // await treasury.deployed();
    // console.log("=====", treasury.address)
    
    await hre.run('verify:verify', {
    address: '0x4CD1B23B538C08cBFaed0f7729744a908a198a3D',
    constructorArguments: [
        '0x825bD94275D1b47A5842238Ece90AaB910923311',
        '0xa011d8060c3AeDFD9305De114fF11082a3Dc8928',
    ],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main2().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// main2().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });