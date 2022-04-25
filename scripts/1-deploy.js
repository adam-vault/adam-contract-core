// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const deployResultStore = require('./utils/deploy-result-store');
const overwriteAddressEnv = require('./utils/overwriteAddressEnv');

const FEED_REGISTRY = '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF';

const deployConstantState = async (network = 'rinkeby') => {
  if (network === 'rinkeby') {
    const RinkebyConstant = await hre.ethers.getContractFactory('RinkebyConstant');
    const rinkebyConstant = await RinkebyConstant.deploy();
    await rinkebyConstant.deployed();
    return rinkebyConstant.address;
  }
};

const deployBudgetApprovals = async () => {
  const TransferERC20BudgetApproval = await hre.ethers.getContractFactory('TransferERC20BudgetApproval');
  const transferERC20BudgetApproval = await TransferERC20BudgetApproval.deploy();
  await transferERC20BudgetApproval.deployed();

  const UniswapBudgetApproval = await hre.ethers.getContractFactory('UniswapBudgetApproval');
  const uniswapBudgetApproval = await UniswapBudgetApproval.deploy();
  await uniswapBudgetApproval.deployed();

  return [transferERC20BudgetApproval.address, uniswapBudgetApproval.address];
};

const deployGovernFactory = async () => {
  const GovernFactory = await hre.ethers.getContractFactory('GovernFactory');
  const Govern = await hre.ethers.getContractFactory('Govern');

  const govern = await Govern.deploy();
  await govern.deployed();

  const governFactory = await hre.upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();

  return [governFactory.address, govern.address];
};

async function main () {
  // Gather Current Block Number
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log('Current Block Number', blockNumber);

  const constantState = await deployConstantState();
  const budgetApprovalsAddress = await deployBudgetApprovals();
  const governInfo = await deployGovernFactory();

  const Dao = await hre.ethers.getContractFactory('Dao');
  const Membership = await hre.ethers.getContractFactory('Membership');
  const Adam = await hre.ethers.getContractFactory('Adam');
  const LiquidPool = await hre.ethers.getContractFactory('LiquidPool');
  const MemberToken = await hre.ethers.getContractFactory('MemberToken');

  const dao = await Dao.deploy();
  await dao.deployed();
  const membership = await Membership.deploy();
  await membership.deployed();
  const liquidPool = await LiquidPool.deploy();
  await liquidPool.deployed();
  const memberToken = await MemberToken.deploy();
  await memberToken.deployed();

  const adam = await hre.upgrades.deployProxy(Adam, [
    dao.address, membership.address, liquidPool.address, memberToken.address, budgetApprovalsAddress, governInfo[0], constantState,
    FEED_REGISTRY, // rinkeby
  ], { kind: 'uups' });
  await adam.deployed();

  // Gather Contract Addresses
  const contractAddresses = {
    adam: adam.address,
    dao: dao.address,
    membership: membership.address,
    governFactory: governInfo[0],
    govern: governInfo[1],
    transferErc20BudgetApproval: budgetApprovalsAddress[0],
    uniswapBudgetApproval: budgetApprovalsAddress[1],
  };
  console.log('Contract Addresses', contractAddresses);

  // Output Deployment Info as file
  if (process.env.CI) {
    deployResultStore.save({
      block_number: blockNumber,
      addresses: contractAddresses,
      initdata_addresses: {},
    });
  } else {
    overwriteAddressEnv({
      TRANSFER_ERC20_APPROVAL_IMPLEMENTATION: budgetApprovalsAddress[0],
      UNISWAP_APPROVAL_IMPLEMENTATION: budgetApprovalsAddress[1],
      GOVERN_IMPLEMENTATION: governInfo[1],
      DAO_IMPLEMENTATION: dao.address,
      MEMBERSHIP_IMPLEMENTATION: membership.address,
      ADAM: adam.address,
      GOVERN_FACTORY: governInfo[0],
    });
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
