
const chai = require('chai');
const hre = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam, createTokens } = require('../utils/createContract');
chai.use(smock.matchers);

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');
describe('Adam.sol', function () {
  let tokenA, tokenB;
  let feedRegistry;
  let adam;

  beforeEach(async function () {
    const tokens = await createTokens();
    tokenA = tokens.tokenA;
    tokenB = tokens.tokenB;

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);

    adam = await createAdam();
  });

  it('emit correct event when whitelist and abandon BAs', async function () {
    expect(await adam.budgetApprovals(tokenA.address)).equal(false);
    expect(await adam.budgetApprovals(tokenB.address)).equal(false);

    await expect(adam.whitelistBudgetApprovals([tokenA.address, tokenB.address]))
      .to.emit(adam, 'WhitelistBudgetApproval');
    expect(await adam.budgetApprovals(tokenA.address)).equal(true);
    expect(await adam.budgetApprovals(tokenB.address)).equal(true);

    await expect(adam.abandonBudgetApprovals([tokenA.address, tokenB.address]))
      .to.emit(adam, 'AbandonBudgetApproval');
    expect(await adam.budgetApprovals(tokenA.address)).equal(false);
    expect(await adam.budgetApprovals(tokenB.address)).equal(false);
  });
});
