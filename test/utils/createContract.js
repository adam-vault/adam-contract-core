const { ethers, upgrades } = require('hardhat');

const deployConstantState = async (signer, network = 'rinkeby') => {
  let ConstantContract;

  if (network === 'rinkeby') {
    ConstantContract = await ethers.getContractFactory('RinkebyConstant', { signer });
  }

  if (network === 'test') {
    ConstantContract = await ethers.getContractFactory('MockConstant', { signer });
  }

  const constantContract = await ConstantContract.deploy();
  await constantContract.deployed();
  return constantContract.address;
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

const createAdam = async ({ network } = {}) => {
  const [creator] = await ethers.getSigners();

  const constantState = await deployConstantState(creator, network);
  const budgetApprovalsAddress = await deployBudgetApprovals(creator);
  const Dao = await ethers.getContractFactory('MockDaoV2', { signer: creator });
  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });
  const GovernFactory = await ethers.getContractFactory('GovernFactory', { signer: creator });
  const Govern = await ethers.getContractFactory('Govern', { signer: creator });
  const MultiToken = await ethers.getContractFactory('MultiToken', { signer: creator });
  const MemberToken = await ethers.getContractFactory('MemberToken', { signer: creator });

  const dao = await Dao.deploy();
  const membership = await Membership.deploy();
  const multiToken = await MultiToken.deploy();
  const govern = await Govern.deploy();
  const memberToken = await MemberToken.deploy();
  await dao.deployed();
  await membership.deployed();
  await govern.deployed();
  await multiToken.deployed();
  await memberToken.deployed();

  const governFactory = await upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();
  const adam = await upgrades.deployProxy(Adam, [dao.address, membership.address, multiToken.address, memberToken.address, budgetApprovalsAddress, governFactory.address, constantState], { kind: 'uups' });

  await adam.deployed();
  return adam;
};

const createTokens = async () => {
  const TokenA = await ethers.getContractFactory('TokenA');
  const tokenA = await TokenA.deploy();
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory('TokenB');
  const tokenB = await TokenB.deploy();
  await tokenB.deployed();

  const TokenC721 = await ethers.getContractFactory('TokenC721');
  const tokenC721 = await TokenC721.deploy();
  await tokenC721.deployed();

  const MockWETH9 = await ethers.getContractFactory('MockWETH9');
  const mockWETH9 = await MockWETH9.deploy();
  await mockWETH9.deployed();

  return { tokenA, tokenB, tokenC721, mockWETH9 };
};

const createGovern = async () => {
  const [creator] = await ethers.getSigners();

  const TokenA = await ethers.getContractFactory('TokenA');
  const tokenA = await TokenA.deploy();
  await tokenA.deployed();

  const Govern = await ethers.getContractFactory('Govern', { signer: creator });
  const govern = await Govern.deploy(
    tokenA.address,
    '123',
    1,
    1,
    1,
    [1],
    [tokenA.address],
  );

  await govern.deployed();
  return govern;
};

module.exports = {
  createAdam,
  createTokens,
  createGovern,
};
