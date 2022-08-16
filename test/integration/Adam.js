const chai = require('chai');
const hre = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam, createTokens } = require('../utils/createContract');
const decodeBase64 = require('../utils/decodeBase64');
const paramsStruct = require('../../utils/paramsStruct');
chai.use(smock.matchers);
const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('Integration - Adam.sol', function () {
  let creator;
  let token;
  let feedRegistry;
  let adam;

  function createDao () {
    return adam.createDao(paramsStruct.getCreateDaoParams({ name: 'A Company' }));
  };

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    const tokens = await createTokens();
    token = tokens.tokenA;

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    adam = await createAdam();
  });

  describe('when createDao() called', function () {
    it('creates successfully', async function () {
      await expect(createDao())
        .to.emit(adam, 'CreateDao');
    });

    it('produces upgradable dao', async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

      const MockDaoV2 = await ethers.getContractFactory('MockDaoV2');
      const mockDaoV2 = await MockDaoV2.deploy();
      await mockDaoV2.deployed();

      const dao = await ethers.getContractAt('Dao', daoAddr);
      await dao.upgradeTo(mockDaoV2.address);

      const daoUpgraded = await ethers.getContractAt('MockDaoV2', daoAddr);

      expect(await daoUpgraded.v2()).to.equal(true);
    });

    it('creates successfully when set 0x0 as admission token', async function () {
      await expect(adam.createDao(
        paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[ethers.constants.AddressZero, 50, 0, true]],
        }),
      )).to.not.be.reverted;
    });

    it('throws "Admission Token not Support!" error when set non-contract address as admission token', async function () {
      await expect(adam.createDao(
        paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[await creator.getAddress(), 50, 0, false]],
        }),
      )).to.be.revertedWith('Admission Token not Support!');
    });
  });
});
