// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

async function main () {
  const Dao = await hre.ethers.getContractFactory('Dao');
  const Membership = await hre.ethers.getContractFactory('Membership');
  const Adam = await hre.ethers.getContractFactory('Adam');

  const dao = await Dao.deploy();
  await dao.deployed();
  const membership = await Membership.deploy();
  await membership.deployed();

  const adam = await hre.upgrades.deployProxy(Adam, [dao.address, membership.address], { kind: 'uups' });
  await adam.deployed();

  console.log('dao deployed to: ', dao.address);
  console.log('membership deployed to: ', membership.address);
  console.log('adam deployed to: ', adam.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
