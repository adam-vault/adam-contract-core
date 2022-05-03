const { ethers, upgrades } = require('hardhat');

const deployConstantState = async (signer, network = 'rinkeby') => {
  if (network === 'rinkeby') {
    const RinkebyConstant = await ethers.getContractFactory('RinkebyConstant', { signer });
    const rinkebyConstant = await RinkebyConstant.deploy();
    await rinkebyConstant.deployed();
    return rinkebyConstant.address;
  }
};

const createBudgetApprovals = async (signer) => {
  const TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer });
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();

  const UniswapBudgetApproval = await ethers.getContractFactory('UniswapBudgetApproval');
  const uniswapBudgetApproval = await UniswapBudgetApproval.deploy();
  await uniswapBudgetApproval.deployed();

  return [transferERC20BudgetApproval.address, uniswapBudgetApproval.address];
};

const createFeedRegistry = async (token, signer) => {
  const FeedRegistry = await ethers.getContractFactory('MockFeedRegistry', { signer });
  const feedRegistry = await FeedRegistry.deploy();
  await feedRegistry.setPrice(ethers.utils.parseEther('0.0046'));
  await feedRegistry.setFeed(token.address, true);
  return feedRegistry;
};

const createAdam = async (feedRegistry, budgetApprovalAddresses) => {
  const [creator] = await ethers.getSigners();

  const constantState = await deployConstantState(creator);
  const Dao = await ethers.getContractFactory('MockDaoV2', { signer: creator });

  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });
  const GovernFactory = await ethers.getContractFactory('GovernFactory', { signer: creator });
  const Govern = await ethers.getContractFactory('Govern', { signer: creator });
  const LiquidPool = await ethers.getContractFactory('LiquidPool', { signer: creator });
  const DepositPool = await ethers.getContractFactory('DepositPool', { signer: creator });

  const MemberToken = await ethers.getContractFactory('MemberToken', { signer: creator });

  const dao = await Dao.deploy();
  if (!feedRegistry) {
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    const token = await MockToken.deploy();
    await token.deployed();
    feedRegistry = await createFeedRegistry(token, creator);
  }
  if (!budgetApprovalAddresses) {
    budgetApprovalAddresses = await createBudgetApprovals(creator);
  }
  const membership = await Membership.deploy();
  const liquidPool = await LiquidPool.deploy();
  const depositPool = await DepositPool.deploy();
  const govern = await Govern.deploy();
  const memberToken = await MemberToken.deploy();
  await dao.deployed();
  await membership.deployed();
  await govern.deployed();
  await liquidPool.deployed();
  await depositPool.deployed();
  await memberToken.deployed();

  const governFactory = await upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();
  const adam = await upgrades.deployProxy(Adam, [
    dao.address,
    membership.address,
    liquidPool.address,
    memberToken.address,
    depositPool.address,
    budgetApprovalAddresses,
    governFactory.address,
    constantState,
    feedRegistry.address,
  ], { kind: 'uups' });

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

  return { tokenA, tokenB, tokenC721 };
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
  createFeedRegistry,
  createAdam,
  createTokens,
  createGovern,
  createBudgetApprovals,
};
