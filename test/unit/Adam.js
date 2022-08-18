const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { deployMockContract } = require('ethereum-waffle');
const findEventArgs = require('../../utils/findEventArgs');
const paramsStruct = require('../../utils/paramsStruct');

describe('Adam.sol', function () {
  let creator;
  let adam;

  beforeEach(async function () {
    [creator] = await ethers.getSigners();

    const Membership = await ethers.getContractFactory('MockMembership');
    const membership = await Membership.deploy();
    await membership.deployed();

    const LiquidPool = await ethers.getContractFactory('MockLiquidPool');
    const liquidPool = await LiquidPool.deploy();
    await liquidPool.deployed();

    const Dao = await ethers.getContractFactory('MockLPDao');
    const dao = await Dao.deploy();
    await dao.deployed();

    const FeedRegistry = await ethers.getContractFactory('MockFeedRegistry');
    const feedRegistry = await FeedRegistry.deploy();
    await feedRegistry.deployed();

    const MemberToken = await ethers.getContractFactory('MemberToken');
    const memberToken = await deployMockContract(creator, MemberToken.interface.fragments);

    const UniswapBudgetApproval = await ethers.getContractFactory('UniswapBudgetApproval');
    const uniswapBudgetApproval = await deployMockContract(creator, UniswapBudgetApproval.interface.fragments);

    const GovernFactory = await ethers.getContractFactory('GovernFactory');
    const governFactory = await deployMockContract(creator, GovernFactory.interface.fragments);

    const Team = await ethers.getContractFactory('Team');
    const team = await deployMockContract(creator, Team.interface.fragments);

    const Adam = await ethers.getContractFactory('Adam');
    adam = await upgrades.deployProxy(Adam, [
      dao.address,
      membership.address,
      liquidPool.address,
      memberToken.address,
      [uniswapBudgetApproval.address],
      governFactory.address,
      feedRegistry.address,
      team.address,
    ]);
  });

  describe('createDao()', function () {
    it('creates a new dao', async function () {
      const tx = await adam.createDao(paramsStruct.getCreateDaoParams({}));
      const { dao: daoAddress } = await findEventArgs(tx, 'CreateDao');
      expect(await adam.daos(daoAddress)).to.equal(true);
    });
  });
});
