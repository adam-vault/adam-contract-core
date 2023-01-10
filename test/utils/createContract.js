const { ethers, upgrades } = require('hardhat');


const createBudgetApprovals = async (signer) => {
  const TransferLiquidERC20BudgetApproval = await ethers.getContractFactory('TransferLiquidERC20BudgetApproval', { signer });
  const transferLiquidERC20BudgetApproval = await TransferLiquidERC20BudgetApproval.deploy();
  await transferLiquidERC20BudgetApproval.deployed();

  const UniswapLiquidBudgetApproval = await ethers.getContractFactory('UniswapLiquidBudgetApproval');
  const uniswapLiquidBudgetApproval = await UniswapLiquidBudgetApproval.deploy();
  await uniswapLiquidBudgetApproval.deployed();

  const TransferERC721BudgetApproval = await ethers.getContractFactory('TransferERC721BudgetApproval', { signer });
  const transferERC721BudgetApproval = await TransferERC721BudgetApproval.deploy();
  await transferERC721BudgetApproval.deployed();

  const TransferERC20BudgetApproval = await ethers.getContractFactory('TransferERC20BudgetApproval', { signer });
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();

  return [transferLiquidERC20BudgetApproval.address, uniswapLiquidBudgetApproval.address, transferERC721BudgetApproval.address, transferERC20BudgetApproval.address];
};

const createPriceGateways = async (signer) => {
  const ArbitrumChainlinkPriceGateway = await ethers.getContractFactory('ArbitrumChainlinkPriceGateway', { signer });
  const arbitrumChainlinkPriceGateway = await ArbitrumChainlinkPriceGateway.deploy();
  await arbitrumChainlinkPriceGateway.deployed();

  const EthereumChainlinkPriceGateway = await ethers.getContractFactory('EthereumChainlinkPriceGateway', { signer });
  const ethereumChainlinkPriceGateway = await EthereumChainlinkPriceGateway.deploy();
  await ethereumChainlinkPriceGateway.deployed();

  return [arbitrumChainlinkPriceGateway.address, ethereumChainlinkPriceGateway.address];
};

const createAdam = async ({ budgetApprovalAddresses, priceGatewayAddresses }) => {
  const [creator] = await ethers.getSigners();

  const Dao = await ethers.getContractFactory('MockDao', { signer: creator });

  const Membership = await ethers.getContractFactory('Membership', { signer: creator });
  const Adam = await ethers.getContractFactory('Adam', { signer: creator });
  const GovernFactory = await ethers.getContractFactory('GovernFactory', { signer: creator });
  const Govern = await ethers.getContractFactory('Govern', { signer: creator });
  const LiquidPool = await ethers.getContractFactory('LiquidPool', { signer: creator });
  const Team = await ethers.getContractFactory('Team', { signer: creator });
  const AccountSystem = await ethers.getContractFactory('AccountSystem', { signer: creator });

  const MemberToken = await ethers.getContractFactory('MemberToken', { signer: creator });

  const dao = await Dao.deploy();
  if (!budgetApprovalAddresses) {
    budgetApprovalAddresses = await createBudgetApprovals(creator);
  }
  if (!priceGatewayAddresses) {
    priceGatewayAddresses = await createBudgetApprovals(creator);
  }

  const membership = await Membership.deploy();
  const liquidPool = await LiquidPool.deploy();
  const team = await Team.deploy();
  const accountSystem = await AccountSystem.deploy();

  const govern = await Govern.deploy();
  const memberToken = await MemberToken.deploy();
  await dao.deployed();
  await membership.deployed();
  await govern.deployed();
  await liquidPool.deployed();
  await memberToken.deployed();
  await team.deployed();
  await accountSystem.deployed();

  const governFactory = await upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();
  const adam = await upgrades.deployProxy(Adam, [
    dao.address,
    membership.address,
    liquidPool.address,
    memberToken.address,
    accountSystem.address,
    budgetApprovalAddresses,
    priceGatewayAddresses,
    governFactory.address,
    team.address,
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

  const TokenD1155 = await ethers.getContractFactory('TokenD1155');
  const tokenD1155 = await TokenD1155.deploy();
  await tokenD1155.deployed();

  return { tokenA, tokenB, tokenC721, tokenD1155 };
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
};

module.exports = {
  createAdam,
  createTokens,
  createGovern,
  createBudgetApprovals,
  createPriceGateways,
};
