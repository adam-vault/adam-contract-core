// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const fileReader = require('../utils/fileReader');

const FEED_REGISTRY = '0xf948fC3D6c2c2C866f622c79612bB4E8708883cF';

const deployConstantState = async (network = 'rinkeby') => {
  if (network === 'rinkeby') {
    const RinkebyConstant = await hre.ethers.getContractFactory('RinkebyConstant');
    const rinkebyConstant = await RinkebyConstant.deploy();
    await rinkebyConstant.deployed();
    console.log(`Deployed RinkebyConstant ${rinkebyConstant.address}`);
    return rinkebyConstant.address;
  }
};

const deployBudgetApprovals = async () => {
  const TransferLiquidERC20BudgetApproval = await hre.ethers.getContractFactory('TransferLiquidERC20BudgetApproval');
  const transferLiquidERC20BudgetApproval = await TransferLiquidERC20BudgetApproval.deploy();
  await transferLiquidERC20BudgetApproval.deployed();
  console.log(`Deployed TransferLiquidERC20BudgetApproval ${transferLiquidERC20BudgetApproval.address}`);

  const UniswapBudgetApproval = await hre.ethers.getContractFactory('UniswapBudgetApproval');
  const uniswapBudgetApproval = await UniswapBudgetApproval.deploy();
  await uniswapBudgetApproval.deployed();
  console.log(`Deployed UniswapBudgetApproval ${uniswapBudgetApproval.address}`);

  const TransferERC721BudgetApproval = await hre.ethers.getContractFactory('TransferERC721BudgetApproval');
  const transferERC721BudgetApproval = await TransferERC721BudgetApproval.deploy();
  await transferERC721BudgetApproval.deployed();
  console.log(`Deployed TransferERC721BudgetApproval ${transferERC721BudgetApproval.address}`);

  const TransferUnregisteredERC20BudgetApproval = await hre.ethers.getContractFactory('TransferUnregisteredERC20BudgetApproval');
  const transferUnregisteredERC20BudgetApproval = await TransferUnregisteredERC20BudgetApproval.deploy();
  await transferUnregisteredERC20BudgetApproval.deployed();
  console.log(`Deployed TransferUnregisteredERC20BudgetApproval ${transferUnregisteredERC20BudgetApproval.address}`);

  return [transferLiquidERC20BudgetApproval.address, uniswapBudgetApproval.address, transferERC721BudgetApproval.address, transferUnregisteredERC20BudgetApproval.address];
};

const deployGovernFactory = async () => {
  const GovernFactory = await hre.ethers.getContractFactory('GovernFactory');
  const Govern = await hre.ethers.getContractFactory('Govern');

  const govern = await Govern.deploy();
  await govern.deployed();
  console.log(`Deployed Govern ${govern.address}`);

  const governFactory = await hre.upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  await governFactory.deployed();
  console.log(`Deployed GovernFactory ${governFactory.address}`);

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
  const DepositPool = await hre.ethers.getContractFactory('DepositPool');
  const OptInPool = await hre.ethers.getContractFactory('OptInPool');
  const MemberToken = await hre.ethers.getContractFactory('MemberToken');

  const dao = await Dao.deploy();
  await dao.deployed();
  console.log(`Deployed DAO ${dao.address}`);

  const membership = await Membership.deploy();
  await membership.deployed();
  console.log(`Deployed Membership ${membership.address}`);

  const liquidPool = await LiquidPool.deploy();
  await liquidPool.deployed();
  console.log(`Deployed LiquidPool ${liquidPool.address}`);

  const depositPool = await DepositPool.deploy();
  await depositPool.deployed();
  console.log(`Deployed DepositPool ${depositPool.address}`);

  const optInPool = await OptInPool.deploy();
  await optInPool.deployed();
  console.log(`Deployed OptInPool ${optInPool.address}`);

  const memberToken = await MemberToken.deploy();
  await memberToken.deployed();
  console.log(`Deployed MemberToken ${memberToken.address}`);

  const adam = await hre.upgrades.deployProxy(Adam, [
    dao.address, membership.address, liquidPool.address, memberToken.address,
    depositPool.address,
    optInPool.address,
    budgetApprovalsAddress, governInfo[0], constantState,
    FEED_REGISTRY, // rinkeby
  ], { kind: 'uups' });
  await adam.deployed();
  console.log(`Deployed Adam ${adam.address}`);

  // Gather Contract Addresses
  const contractAddresses = {
    adam: adam.address,
    dao: dao.address,
    membership: membership.address,
    governFactory: governInfo[0],
    govern: governInfo[1],
    transferLiquidERC20BudgetApproval: budgetApprovalsAddress[0],
    uniswapBudgetApproval: budgetApprovalsAddress[1],
    transferErc721BudgetApproval: budgetApprovalsAddress[2],
    transferUnregisteredErc20BudgetApproval: budgetApprovalsAddress[3],
  };
  console.log('Contract Addresses', contractAddresses);

  // Output Deployment Info as file
  fileReader.save('deploy', 'results.json', {
    block_number: blockNumber,
    addresses: contractAddresses,
    initdata_addresses: {},
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
