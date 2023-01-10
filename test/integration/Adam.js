const chai = require('chai');
const hre = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam, createTokens, createPriceGateways } = require('../utils/createContract');
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
  let adam, priceGatewayAddresses, ethereumChainlinkPriceGateway;

  async function createDao () {
    return adam.createDao(...paramsStruct.getCreateDaoParams({
      name: 'A Company',
      depositTokens: [],
      priceGateways: [ethereumChainlinkPriceGateway],
    }));
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

    priceGatewayAddresses = await createPriceGateways(creator);
    ethereumChainlinkPriceGateway = priceGatewayAddresses[1];
    adam = await createAdam({ priceGatewayAddresses });
  });

  describe('when createDao() called', function () {
    it('creates successfully', async function () {
      await expect(createDao())
        .to.emit(adam, 'CreateDao');
    });

    it('produces upgradable dao', async function () {
      const tx1 = await createDao();
      const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');

      const MockDao = await ethers.getContractFactory('MockDao');
      const mockDao = await MockDao.deploy();
      await mockDao.deployed();
      const dao = await ethers.getContractAt('Dao', daoAddr);
      await dao.upgradeTo(mockDao.address);
      const daoUpgraded = await ethers.getContractAt('MockDao', daoAddr);

      expect(await daoUpgraded.v2()).to.equal(true);
    });

    it('creates successfully when set 0x0 as admission token', async function () {
      await expect(adam.createDao(
        ...paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[ethers.constants.AddressZero, 50, 0, true]],
          priceGateways: [ethereumChainlinkPriceGateway],
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
