const { ethers, upgrades } = require('hardhat');

const deployBudgetApprovals = async (signer) => {
  const TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer });
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();

  return [transferERC20BudgetApproval.address];
};

const createAdam = async () => {
  const [creator] = await ethers.getSigners();

  const budgetApprovalsAddress = await deployBudgetApprovals(creator);
  const Dao = await ethers.getContractFactory('Dao', { signer: creator });
  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });

  const dao = await Dao.deploy();
  const membership = await Membership.deploy();
  await dao.deployed();
  await membership.deployed();

  const adam = await upgrades.deployProxy(Adam, [dao.address, membership.address, budgetApprovalsAddress], { kind: 'uups' });
  await adam.deployed();
  return adam;
};

module.exports = {
  createAdam,
};
