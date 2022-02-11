const { ethers, upgrades } = require('hardhat');

const createAdam = async () => {
  const [creator] = await ethers.getSigners();

  const UniswapSwaper = await ethers.getContractFactory('UniswapSwaper', { signer: creator });
  const uniswapSwaper = await UniswapSwaper.deploy();
  await uniswapSwaper.deployed();

  const libraries = {
    UniswapSwaper: uniswapSwaper.address,
  };

  const AssetManager = await ethers.getContractFactory('AssetManager', { libraries, signer: creator });
  const Strategy = await ethers.getContractFactory('Strategy', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });

  const assetManager = await AssetManager.deploy();
  const strategy = await Strategy.deploy();
  await assetManager.deployed();
  await strategy.deployed();

  const adam = await upgrades.deployProxy(Adam, [assetManager.address, strategy.address], { kind: 'uups' });
  await adam.deployed();
  return {
    libraries,
    assetManager,
    strategy,
    adam,
  };
};

module.exports = {
  createAdam,
};
