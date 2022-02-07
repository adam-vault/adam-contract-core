const { ethers, upgrades } = require('hardhat');

const createToString = async () => {
  const [libCreator] = await ethers.getSigners();
  const ToString = await ethers.getContractFactory('ToString', libCreator);
  const toString = await ToString.deploy();
  await toString.deployed();

  return toString;
};

const createAdam = async () => {
  const [creator] = await ethers.getSigners();
  const AssetManagerFactory = await ethers.getContractFactory('AssetManagerFactory', { signer: creator });
  const StrategyFactory = await ethers.getContractFactory('StrategyFactory', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });

  const assetManagerFactory = await upgrades.deployProxy(AssetManagerFactory, [], { kind: 'uups' });
  const strategyFactory = await upgrades.deployProxy(StrategyFactory, [], { kind: 'uups' });

  await strategyFactory.deployed();
  await assetManagerFactory.deployed();

  const adam = await upgrades.deployProxy(Adam, [assetManagerFactory.address, strategyFactory.address], { kind: 'uups' });
  await adam.deployed();
  return {
    assetManagerFactory,
    strategyFactory,
    adam,
  };
};

module.exports = {
  createToString,
  createAdam,
};
