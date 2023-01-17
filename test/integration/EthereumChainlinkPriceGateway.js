const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
const { createAdam, createTokens, createPriceGateways, createBudgetApprovals } = require('../utils/createContract.js');

const { getCreateTransferLiquidErc20TokenBAParams, getCreateDaoParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
} = require('../utils/constants');

describe('Integration - Dao.sol to EthereumChainlinkPriceGateway.sol', function () {
  let adam, tokenA;
  let creator;
  let budgetApprovalAddresses;
  let feedRegistry, priceGatewayAddresses, ethereumChainlinkPriceGateway, arbitrumChainlinkPriceGateway, dao;

  function createDao () {
    return adam.createDao(...getCreateDaoParams({
      name: 'A Company',
      priceGateways: [ethereumChainlinkPriceGateway],
    }));
  };

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    ({ tokenA } = await createTokens());

    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    priceGatewayAddresses = await createPriceGateways(creator);
    arbitrumChainlinkPriceGateway = priceGatewayAddresses[0];
    ethereumChainlinkPriceGateway = priceGatewayAddresses[1];

    budgetApprovalAddresses = await createBudgetApprovals(creator);

    adam = await createAdam({ budgetApprovalAddresses, priceGatewayAddresses });

    const tx1 = await createDao();
    const { dao: daoAddr } = await findEventArgs(tx1, 'CreateDao');
    dao = await ethers.getContractAt('Dao', daoAddr);
  });

  describe('CreateDao()', function () {
    it('creates Dao successfully with correct param', async function () {
      const accountSystem = await ethers.getContractAt('AccountSystem', await dao.accountSystem());
      expect(await accountSystem.priceGateways(ethereumChainlinkPriceGateway)).to.be.equal(true);
      expect(await accountSystem.priceGateways(arbitrumChainlinkPriceGateway)).to.be.equal(false);
      expect(await accountSystem.defaultPriceGateway()).to.be.equal(ethereumChainlinkPriceGateway);
    });
    it('creates Liquid successfully with correct param', async function () {
      const accountSystem = await ethers.getContractAt('AccountSystem', await dao.accountSystem());
      const liquidPool = await ethers.getContractAt('LiquidPool', await dao.liquidPool());
      expect(await liquidPool.accountSystem()).to.be.equal(accountSystem.address);
    });
  });
});
