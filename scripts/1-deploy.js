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
//   const AssetManager = await hre.ethers.getContractFactory('AssetManager');
//   const Strategy = await hre.ethers.getContractFactory('Strategy');
//   const Adam = await hre.ethers.getContractFactory('Adam');

//   const assetManager = await AssetManager.deploy();
//   await assetManager.deployed();
//   const strategy = await Strategy.deploy();
//   await strategy.deployed();

//   const adam = await hre.upgrades.deployProxy(Adam, [assetManager.address, strategy.address], { kind: 'uups' });
//   await adam.deployed();

//   console.log('assetManager deployed to: ', assetManager.address);
//   console.log('strategy deployed to: ', strategy.address);
//   console.log('adam deployed to: ', adam.address);

//   const PriceConverter = await hre.ethers.getContractFactory('PriceConverter');
//   const priceConverter = await PriceConverter.deploy();
//   await priceConverter.deployed();

  const Treasury = await hre.ethers.getContractFactory('Treasury');
  const treasury = await hre.upgrades.deployProxy(Treasury, ['0x3a30cfda9Bf4F0DFa04A55E05617885E7bC1a122', '0xC95C7113dB1E249B1320935094cE980B7177F8F4']);
  await treasury.deployed();

//   console.log('priceConverter deployed to: ', priceConverter.address);
  console.log('treasury deployed to: ', treasury.address);
}

async function verify () {
    assetManager = '0x156BA0eB65ce2EcBcbcA05af940e8987Cdf9D3b6';
    strategy = '0x905E8267e5110CF876456397eE2873CD1a183B63';
    adam = '0x3a30cfda9Bf4F0DFa04A55E05617885E7bC1a122';
    priceConverter = '0xC95C7113dB1E249B1320935094cE980B7177F8F4';
    treasury = '0xDcEfED1192c24afe41230ae78d88F7A7A5D51f45';

    await hre.run('verify:verify', {
        address: adam,
        constructorArguments: [
            assetManager,
            strategy,
        ]
    });

    await hre.run('verify:verify', {
        address: priceConverter.address,
    });

    await hre.run('verify:verify', {
        address: treasury,
        constructorArguments: [
            adam,
            priceConverter,
        ],
    });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});