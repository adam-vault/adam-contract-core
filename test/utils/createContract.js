const { ethers } = require('hardhat');

const createToString = async () => {
  const [libCreator] = await ethers.getSigners();
  const ToString = await ethers.getContractFactory('ToString', libCreator);
  const toString = await ToString.deploy();
  await toString.deployed();

  return toString;
};

const createAdam = async (toStringContract) => {
  const [creator] = await ethers.getSigners();
  const libraries = {
    ToString: toStringContract.address,
  };
  const AssetManagerFactory = await ethers.getContractFactory('AssetManagerFactory', { signer: creator, libraries });
  const StrategyFactory = await ethers.getContractFactory('StrategyFactory', { signer: creator, libraries });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });

  const assetManagerFactory = await AssetManagerFactory.deploy();
  const strategyFactory = await StrategyFactory.deploy();

  await strategyFactory.deployed();
  await assetManagerFactory.deployed();

  const adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
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
