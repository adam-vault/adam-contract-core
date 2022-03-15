// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');

const deployBudgetApprovals = async () => {
  const TransferERC20BudgetApproval = await hre.ethers.getContractFactory('TransferERC20BudgetApproval');
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();

  return [transferERC20BudgetApproval.address];
};

async function main () {
  const budgetApprovalsAddress = await deployBudgetApprovals();
  const Dao = await hre.ethers.getContractFactory('Dao');
  const Membership = await hre.ethers.getContractFactory('Membership');
  const Adam = await hre.ethers.getContractFactory('Adam');
  const GovernFactory = await ethers.getContractFactory('GovernFactory');
  const Govern = await ethers.getContractFactory('Govern');

  const dao = await Dao.deploy();
  await dao.deployed();
  const membership = await Membership.deploy();
  await membership.deployed();
  const governFactory = await GovernFactory.deploy();
  await governFactory.deployed();
  const govern = await Govern.deploy();
  await govern.deployed();

  const adam = await hre.upgrades.deployProxy(Adam, [dao.address, membership.address, budgetApprovalsAddress, governFactory.address, govern.address], { kind: 'uups' });
  await adam.deployed();

  console.log('dao deployed to: ', dao.address);
  console.log('membership deployed to: ', membership.address);
  console.log('adam deployed to: ', adam.address);
  console.log('budget approvals deployed to: ', budgetApprovalsAddress);
  console.log('governFactory deployed to', governFactory.address);
  console.log('govern deployed to', govern.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
