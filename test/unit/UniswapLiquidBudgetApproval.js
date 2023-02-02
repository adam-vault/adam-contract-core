const chai = require('chai');
const { ethers, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const {
  ADDRESS_UNISWAP_ROUTER,
  ADDRESS_ETH,
} = require('../utils/constants');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe('UniswapLiquidBudgetApproval.sol - test/unit/UniswapLiquidBudgetApproval.js', async function () {
  let executor;
  let mockToken, mockTokenB, team, executee, mockUniswapRouter;
  let executeeAsSigner, UniswapLiquidBudgetApproval, ERC1967Proxy, uniswapBAImpl, accountingSystem;

  function initializeParser (params = {}) {
    return [[
      params.executor || executor.address,
      params.executorTeamId || 0,
      params.approvers || [],
      params.approverTeamId || 0,
      params.minApproval || 0,
      params.text || 'text',
      params.transactionType || 'transactionType',
      params.startTime || Math.round(Date.now() / 1000) - 86400,
      params.endTime || Math.round(Date.now() / 1000) + 86400,
      params.allowUnlimitedUsageCount || true,
      params.usageCount || 0,
    ],
    params.fromTokens || [ADDRESS_ETH],
    params.allowAllToTokens ?? true,
    params.toTokens || [],
    params.allowAnyAmount ?? true,
    params.totalAmount || 0,
    params.amountPercentage || 100,
    params.baseCurrency || ADDRESS_ETH,
    ];
  }

  function encodeTxData (to, data, value) {
    return abiCoder.encode(['address to', 'bytes data', 'uint256 value'], [
      to,
      data,
      value,
    ]);
  }

  function encodeExactInputSwapData (tokenIn, tokenOut, recipient, amountIn, amountOutMinimum) {
    const data = mockUniswapRouter.interface.encodeFunctionData('exactInputSingle', [[
      tokenIn,
      tokenOut,
      0,
      recipient,
      amountIn,
      amountOutMinimum,
      0,
    ]]);

    return mockUniswapRouter.interface.encodeFunctionData('multicall(uint256,bytes[])', [
      ethers.constants.MaxUint256,
      [data],
    ]);
  }

  beforeEach(async function () {
    [executor] = await ethers.getSigners();

    team = await smock.fake('Team');
    accountingSystem = await smock.fake('AccountingSystem');
    executee = await (await smock.mock('MockBudgetApprovalExecutee')).deploy();
    await executee.setVariable('_accountingSystem', accountingSystem.address);
    await executee.setVariable('_team', team.address);

    accountingSystem.isSupportedPair.whenCalledWith(ADDRESS_ETH, ADDRESS_ETH).returns(accountingSystem.address);
    accountingSystem.assetPrice.returns(([,, amount]) => {
      return amount;
    });
    mockToken = await smock.fake('ERC20');
    mockTokenB = await smock.fake('ERC20');
    mockUniswapRouter = await smock.fake('MockUniswapRouter');

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [executee.address],
    });
    await network.provider.send(
      'hardhat_setBalance', [
        executee.address,
        '0x10000000000000000000000000000',
      ]);

    executeeAsSigner = await ethers.getSigner(executee.address);
    UniswapLiquidBudgetApproval = await ethers.getContractFactory('UniswapLiquidBudgetApproval', { signer: executeeAsSigner });
    ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', { signer: executeeAsSigner });

    uniswapBAImpl = await UniswapLiquidBudgetApproval.deploy();
  });

  describe('initialize()', async function () {
    it('init with params with the least setting successfully', async () => {
      const contract = await ERC1967Proxy.deploy(
        uniswapBAImpl.address,
        UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser()));
      const uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);

      expect(await uniswapBA.name()).to.be.eq('Uniswap Liquid Budget Approval');
      expect(await uniswapBA.fromTokens(0)).to.be.eq(ADDRESS_ETH);
      expect(await uniswapBA.allowAllToTokens()).to.be.eq(true);
      expect(await uniswapBA.allowAnyAmount()).to.be.eq(true);
      expect(await uniswapBA.totalAmount()).to.be.eq(ethers.BigNumber.from('0'));
      expect(await uniswapBA.amountPercentage()).to.be.eq(100);
    });
    it('init with params with complex setting successfully', async () => {
      const contract = await ERC1967Proxy.deploy(
        uniswapBAImpl.address,
        UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          fromTokens: [ADDRESS_ETH],
          allowAllToTokens: false,
          toTokens: [mockToken.address],
          allowAnyAmount: false,
          totalAmount: ethers.BigNumber.from('1000'),
          amountPercentage: 50,
          baseCurrency: ADDRESS_ETH,
        })));
      const uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);

      expect(await uniswapBA.name()).to.be.eq('Uniswap Liquid Budget Approval');
      expect(await uniswapBA.fromTokens(0)).to.be.eq(ADDRESS_ETH);
      expect(await uniswapBA.allowAllToTokens()).to.be.eq(false);
      expect(await uniswapBA.toTokensMapping(mockToken.address)).to.be.eq(true);
      expect(await uniswapBA.allowAnyAmount()).to.be.eq(false);
      expect(await uniswapBA.totalAmount()).to.be.eq(ethers.BigNumber.from('1000'));
      expect(await uniswapBA.amountPercentage()).to.be.eq(50);
    });
    it('throws "Duplicated token in target token list" error if toTokens duplicated', async () => {
      await expect(ERC1967Proxy.deploy(
        uniswapBAImpl.address,
        UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          allowAllToTokens: false,
          toTokens: [mockToken.address, mockToken.address],
        })))).to.be.revertedWith('Duplicated token');
    });
  });

  describe('executeParams()', async function () {
    let uniswapBA;
    beforeEach(async function () {
      const contract = await ERC1967Proxy.deploy(
        uniswapBAImpl.address,
        UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser()));
      uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);
    });
    it('describes execute params', async function () {
      expect(await uniswapBA.executeParams()).to.be.deep.equal(['address to', 'bytes data', 'uint256 value']);
    });
  });

  describe('execute()', async function () {
    context('allow limited absolute amount', async function () {
      let uniswapBA;
      beforeEach(async function () {
        const contract = await ERC1967Proxy.deploy(
          uniswapBAImpl.address,
          UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
            allowAllToAddresses: true,
            toAddresses: [],
            allowAnyAmount: false,
            totalAmount: 100,
          })));
        uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);
        executee.executeByBudgetApproval.returns('0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000a');
      });

      it('allows user to swap under allow amount', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 99, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

        executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
          ADDRESS_UNISWAP_ROUTER,
          callData,
          BigNumber.from('0'));
      });

      it('allows user to swap equal allow amount', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 100, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('allows user to swap amount twice', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 50, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Exceeded max budget transferable amount" error if the 1st time outflow exceeds amount limit', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 101, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Exceeded max amount');
      });

      it('throws "Exceeded max budget transferable amount" error if the 2nd time outflow exceeds amount limit', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 50, 10);

        await uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '');

        const callData2 = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 51, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData2, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Exceeded max amount');
      });
    });

    context('allow limited percentage of token', async function () {
      let uniswapBA;
      beforeEach(async function () {
        const contract = await ERC1967Proxy.deploy(
          uniswapBAImpl.address,
          UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
            fromTokens: [ADDRESS_ETH],
            amountPercentage: 25,
          })));
        uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to swap under allow percentage amount', async function () {
        await network.provider.send(
          'hardhat_setBalance', [
            executee.address,
            '0xC8',
          ]);
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 50, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('allows user to swap equal allow percentage amount', async function () {
        await network.provider.send(
          'hardhat_setBalance', [
            executee.address,
            '0x64',
          ]);
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 25, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('allows user to swap percentage amount twice', async function () {
        await network.provider.send(
          'hardhat_setBalance', [
            executee.address,
            '0x32',
          ]);
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 10, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Exceeded percentage" if swap exceeds percentage limit', async function () {
        await network.provider.send(
          'hardhat_setBalance', [
            executee.address,
            '0x32',
          ]);
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 40, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Exceeded percentage');
      });
    });

    context('allow limited fromTokens', async function () {
      let uniswapBA;
      beforeEach(async function () {
        const contract = await ERC1967Proxy.deploy(
          uniswapBAImpl.address,
          UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
            fromTokens: [ADDRESS_ETH],
          })));
        uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to swap fromToken', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 10, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Source token not whitelisted" if swap not whitelisted token', async function () {
        const callData = encodeExactInputSwapData(mockTokenB.address, mockToken.address, executee.address, 10, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Source token not whitelisted');
      });
    });

    context('allow limited toTokens', async function () {
      let uniswapBA;
      beforeEach(async function () {
        const contract = await ERC1967Proxy.deploy(
          uniswapBAImpl.address,
          UniswapLiquidBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
            fromTokens: [ADDRESS_ETH],
            allowAllToTokens: false,
            toTokens: [mockTokenB.address],
          })));
        uniswapBA = await ethers.getContractAt('UniswapLiquidBudgetApproval', contract.address);
        executee.executeByBudgetApproval.returns('0x');
      });

      it('allows user to swap to toTokens', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockTokenB.address, executee.address, 10, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
      });

      it('throws "Target token not whitelisted" error if swap to not whitelisted token', async function () {
        const callData = encodeExactInputSwapData(ADDRESS_ETH, mockToken.address, executee.address, 10, 10);

        await expect(uniswapBA.connect(executor).createTransaction([
          encodeTxData(ADDRESS_UNISWAP_ROUTER, callData, 0),
        ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Target token not whitelisted');
      });
    });
  });
});
