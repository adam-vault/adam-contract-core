const { ethers, upgrades } = require('hardhat');

const createAdam = async () => {
  const [creator] = await ethers.getSigners();

  const Dao = await ethers.getContractFactory('Dao', { signer: creator });
  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });
  const GovernFactory = await ethers.getContractFactory('GovernFactory', { signer: creator });
  const Govern = await ethers.getContractFactory('Govern', { signer: creator });

  const dao = await Dao.deploy();
  const membership = await Membership.deploy();
  const governFactory = await GovernFactory.deploy();
  const govern = await Govern.deploy();
  console.log("=====")
  await dao.deployed();
  console.log("=====")
  await membership.deployed();
  console.log("=====")
  await governFactory.deployed();
  console.log("=====")
  await govern.deployed();
 console.log("=====", govern.address)
  const adam = await upgrades.deployProxy(Adam, [dao.address, membership.address, governFactory.address], { kind: 'uups' });
  await adam.deployed();
  return adam;
};

const createTokens = async () => {
    const TokenA = await ethers.getContractFactory('TokenA');
    tokenA = await TokenA.deploy();
    await tokenA.deployed();

    const TokenB = await ethers.getContractFactory('TokenB');
    tokenB = await TokenB.deploy();
    await tokenB.deployed();

    return { tokenA, tokenB };
}

module.exports = {
  createAdam,
  createTokens,
};
