const { ethers, upgrades } = require('hardhat');

const createAdam = async () => {
  const [creator] = await ethers.getSigners();
  const AssetManagerFactory = await ethers.getContractFactory('AssetManagerFactory', { signer: creator });
  const Strategy = await ethers.getContractFactory('Strategy', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });

  const assetManagerFactory = await upgrades.deployProxy(AssetManagerFactory, [], { kind: 'uups' });
  const strategy = await Strategy.deploy();
  await strategy.deployed();

  await assetManagerFactory.deployed();

  const adam = await upgrades.deployProxy(Adam, [assetManagerFactory.address, strategy.address], { kind: 'uups' });
  await adam.deployed();
  return {
    assetManagerFactory,
    strategy,
    adam,
  };
};

module.exports = {
  createAdam,
};
