const chai = require('chai');
const hre = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');
chai.use(smock.matchers);
const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('Integration - Adam.sol - test/integration/Adam.js', function () {
  let creator;
  let token;
  let feedRegistry;
  let adam;

  function createDao () {
    return adam.createDao(...paramsStruct.getCreateDaoParams({ name: 'A Company' }));
  };

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    token = await smock.fake('ERC20');

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

    it('creates successfully when set 0x0 as admission token', async function () {
      await expect(adam.createDao(
        ...paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[ethers.constants.AddressZero, 50, 0, true]],
        }),
      )).to.not.be.reverted;
    });

    it('throws "init fail - Admission Token not Support!" error when set non-contract address as admission token', async function () {
      await expect(adam.createDao(
        ...paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[creator.address, 50, 0, false]],
        }),
      )).to.be.revertedWith('init fail - Admission Token not Support!');
    });
  });
});
