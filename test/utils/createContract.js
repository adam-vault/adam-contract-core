const { ethers, upgrades } = require('hardhat');

const deployConstantState = async (signer, network = 'rinkeby') => {
  if (network === 'rinkeby') {
    const RinkebyConstant = await ethers.getContractFactory('RinkebyConstant', { signer });
    const rinkebyConstant = await RinkebyConstant.deploy();
    await rinkebyConstant.deployed();
    return rinkebyConstant.address;
  }
};

const deployBudgetApprovals = async (signer) => {
  const TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer });
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();

  const UniswapBudgetApproval = await ethers.getContractFactory('UniswapBudgetApproval');
  const uniswapBudgetApproval = await UniswapBudgetApproval.deploy();
  await uniswapBudgetApproval.deployed();

  return [transferERC20BudgetApproval.address, uniswapBudgetApproval.address];
};

const createAdam = async () => {
  const [creator] = await ethers.getSigners();

  const constantState = await deployConstantState(creator);
  const budgetApprovalsAddress = await deployBudgetApprovals(creator);
  const Dao = await ethers.getContractFactory('Dao', { signer: creator });
  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });
  const GovernFactory = await ethers.getContractFactory('GovernFactory', { signer: creator });
  const Govern = await ethers.getContractFactory('Govern', { signer: creator });

  const dao = await Dao.deploy();
  const membership = await Membership.deploy();
  const govern = await Govern.deploy();
  await dao.deployed();
  await membership.deployed();
  await govern.deployed();
  const governFactory = await upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();
  const adam = await upgrades.deployProxy(Adam, [dao.address, membership.address, budgetApprovalsAddress, governFactory.address, constantState], { kind: 'uups' });

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

const createGovern = async () => {
    const [creator] = await ethers.getSigners();

    const TokenA = await ethers.getContractFactory('TokenA');
    tokenA = await TokenA.deploy();
    await tokenA.deployed();

    const Govern = await ethers.getContractFactory('Govern', { signer: creator });
    const govern = await Govern.deploy(
        tokenA.address,
        '123',
        1,
        1,
        1,
        [1],
        [tokenA.address]
    );

    await govern.deployed();
    return govern;
}

module.exports = {
  createAdam,
  createTokens,
  createGovern,
};
