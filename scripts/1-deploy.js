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

  const UniswapBudgetApproval = await hre.ethers.getContractFactory('UniswapBudgetApproval');
  const uniswapBudgetApproval = await UniswapBudgetApproval.deploy();
  await uniswapBudgetApproval.deployed();

  console.log('budget approvals deployed to: ', [transferERC20BudgetApproval.address, uniswapBudgetApproval.address]);
  return [transferERC20BudgetApproval.address, uniswapBudgetApproval.address];
};

const deployGovernFactory = async () => {
  const GovernFactory = await hre.ethers.getContractFactory('GovernFactory');
  const Govern = await hre.ethers.getContractFactory('Govern');

  const govern = await Govern.deploy();
  await govern.deployed();

  const governFactory = await hre.upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();

  console.log('governFactory deployed to', governFactory.address);
  console.log('govern deployed to', govern.address);
  return governFactory.address;
};

async function main () {
  const budgetApprovalsAddress = await deployBudgetApprovals();
  const governFactory = await deployGovernFactory();

  const Dao = await hre.ethers.getContractFactory('Dao');
  const Membership = await hre.ethers.getContractFactory('Membership');
  const Adam = await hre.ethers.getContractFactory('Adam');

  const dao = await Dao.deploy();
  await dao.deployed();
  const membership = await Membership.deploy();
  await membership.deployed();

  const adam = await hre.upgrades.deployProxy(Adam, [dao.address, membership.address, budgetApprovalsAddress, governFactory.address], { kind: 'uups' });
  await adam.deployed();

  console.log('dao deployed to: ', dao.address);
  console.log('membership deployed to: ', membership.address);
  console.log('adam deployed to: ', adam.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
