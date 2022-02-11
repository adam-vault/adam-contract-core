const { ethers, upgrades } = require('hardhat');

const createAdam = async () => {
  const [creator] = await ethers.getSigners();

  const UniswapSwapper = await ethers.getContractFactory("UniswapSwapper", {
    signer: creator,
  });
  const uniswapSwapper = await UniswapSwapper.deploy();
  await uniswapSwapper.deployed();

  const libraries = {
    UniswapSwapper: uniswapSwapper.address,
  };

  const AssetManager = await ethers.getContractFactory('AssetManager', { signer: creator, libraries });
  const Strategy = await ethers.getContractFactory('Strategy', { signer: creator });
  const Adam = await ethers.getContractFactory('AdamBeaconProxy', { signer: creator });

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
