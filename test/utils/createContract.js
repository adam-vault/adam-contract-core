const { ethers, upgrades } = require('hardhat');

const createAdam = async () => {
  const [creator] = await ethers.getSigners();

  const Dao = await ethers.getContractFactory('Dao', { signer: creator });
  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });

  const dao = await Dao.deploy();
  const membership = await Membership.deploy();
  await dao.deployed();
  await membership.deployed();

  const adam = await upgrades.deployProxy(Adam, [dao.address, membership.address], { kind: 'uups' });
  await adam.deployed();
  return adam;
};

module.exports = {
  createAdam,
};