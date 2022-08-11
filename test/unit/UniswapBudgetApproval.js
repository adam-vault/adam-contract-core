const { expect } = require('chai');
const { ethers } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');
const { createTokens } = require('../utils/createContract');
const { getCreateUniswapBAParams } = require('../../utils/paramsStruct');

const {
  ADDRESS_ETH,
  ADDRESS_UNISWAP_ROUTER,
  ADDRESS_WETH,
  ADDRESS_MOCK_FEED_REGISTRY,
  ADDRESS_MOCK_AGGRGATOR,
} = require('../utils/constants');

const { parseEther } = ethers.utils;
const abiCoder = ethers.utils.defaultAbiCoder;

describe('UniswapBudgetApproval.sol', function () {
  let uniswapBAImplementation, budgetApproval, dao, team, uniswapRouter;
  let executor, approver, receiver;
  let tokenA, executee, UniswapBudgetApproval, WETH;

  beforeEach(async function () {
    [executor, approver, receiver] = await ethers.getSigners();

    ({ tokenA } = await createTokens());

    const MockBudgetApprovalExecutee = await ethers.getContractFactory('MockBudgetApprovalExecutee', { signer: executor });
    UniswapBudgetApproval = await ethers.getContractFactory('UniswapBudgetApproval', { signer: executor });
    uniswapBAImplementation = await UniswapBudgetApproval.deploy();

    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: executor });
    // const Team = await ethers.getContractFactory('Team', { signer: executor });
    // team = await Team.deploy();
    dao = await MockLPDao.deploy();
    executee = await MockBudgetApprovalExecutee.deploy();

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    const feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);
    await feedRegistry.setAggregator(tokenA.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setPrice(tokenA.address, ADDRESS_ETH, parseEther('1'));

    const uniswapRouterArticfact = require('../../artifacts/contracts/mocks/MockUniswapRouter.sol/MockUniswapRouter');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_UNISWAP_ROUTER,
      uniswapRouterArticfact.deployedBytecode,
    ]);
    uniswapRouter = await ethers.getContractAt('MockUniswapRouter', ADDRESS_UNISWAP_ROUTER);
    const wethArticfact = require('../../artifacts/contracts/mocks/MockWETH9.sol/MockWETH9');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_WETH,
      wethArticfact.deployedBytecode,
    ]);
    WETH = await ethers.getContractAt('MockWETH9', ADDRESS_WETH);
  });

  describe('Create Budget Approval', function () {
    it('should success', async function () {
      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = UniswapBudgetApproval.interface.encodeFunctionData('initialize',
        getCreateUniswapBAParams({
          dao: executee.address,
          executor: executor.address,
          allowUnlimitedUsageCount: true,
          approvers: [approver.address],
          fromTokens: [ADDRESS_ETH, ADDRESS_WETH],
          toTokens: [ADDRESS_ETH, ADDRESS_WETH],
          allowAnyAmount: true,
          totalAmount: ethers.utils.parseEther('0'),
          amountPercentage: '100',
          startTime,
          endTime,
          minApproval: 1,
        }));
      const tx = await executee.createBudgetApprovals([uniswapBAImplementation.address], [initData]);
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('UniswapBudgetApproval', budgetApprovalAddress);

      expect(await budgetApproval.dao()).to.eq(executee.address);
      expect(await budgetApproval.executor()).to.eq(executor.address);
      expect(await budgetApproval.approversMapping(approver.address)).to.eq(true);
      expect(await budgetApproval.minApproval()).to.eq(1);

      expect(await budgetApproval.allowAllAddresses()).to.eq(false);

      expect(await budgetApproval.fromTokens(0)).to.eq(ADDRESS_ETH);
      expect(await budgetApproval.fromTokens(1)).to.eq(ADDRESS_WETH);
      expect(await budgetApproval.fromTokensMapping(ADDRESS_ETH)).to.eq(true);
      expect(await budgetApproval.fromTokensMapping(ADDRESS_WETH)).to.eq(true);

      expect(await budgetApproval.toTokensMapping(ADDRESS_ETH)).to.eq(true);
      expect(await budgetApproval.toTokensMapping(ADDRESS_WETH)).to.eq(true);

      expect(await budgetApproval.allowAnyAmount()).to.eq(true);
      expect(await budgetApproval.amountPercentage()).to.eq(100);

      expect(await budgetApproval.startTime()).to.eq(startTime);
      expect(await budgetApproval.endTime()).to.eq(endTime);

      expect(await budgetApproval.allowUnlimitedUsageCount()).to.eq(true);
    });
  });

  describe('Execute Transaction', function () {
    beforeEach(async function () {
      await executor.sendTransaction({ to: executee.address, value: parseEther('200') });

      const startTime = Math.round(Date.now() / 1000) - 86400;
      const endTime = Math.round(Date.now() / 1000) + 86400;
      const initData = UniswapBudgetApproval.interface.encodeFunctionData('initialize',
        getCreateUniswapBAParams({
          dao: executee.address,
          executor: executor.address,
          allowUnlimitedUsageCount: true,
          approvers: [],
          fromTokens: [ADDRESS_ETH, ADDRESS_WETH, tokenA.address],
          toTokens: [ADDRESS_ETH, ADDRESS_WETH, tokenA.address],
          allowAnyAmount: true,
          totalAmount: ethers.utils.parseEther('0'),
          amountPercentage: '100',
          startTime,
          endTime,
          minApproval: 0,
        }));

      const tx = await executee.createBudgetApprovals(
        [uniswapBAImplementation.address], [initData],
      );
      const { budgetApproval: budgetApprovalAddress } = await findEventArgs(tx, 'CreateBudgetApproval');

      budgetApproval = await ethers.getContractAt('UniswapBudgetApproval', budgetApprovalAddress);
      await executor.sendTransaction({ to: ADDRESS_UNISWAP_ROUTER, value: parseEther('100') });
      await tokenA.mint(ADDRESS_UNISWAP_ROUTER, parseEther('100'));
      await WETH.mint(ADDRESS_UNISWAP_ROUTER, parseEther('100'));
    });

    context('Wrap ETH', () => {
      it('should success', async function () {
        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_WETH,
          '0xd0e30db0',
          parseEther('10'),
        ]);

        await budgetApproval.createTransaction([transactionData], Date.now() + 86400, true);

        expect(await WETH.balanceOf(executee.address)).to.eq(parseEther('10'));
      });
    });

    context('Unwrap ETH', () => {
      it('should success', async function () {
        await WETH.mint(executee.address, parseEther('1'));

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_WETH,
          '0x2e1a7d4d000000000000000000000000000000000000000000000000016345785d8a0000',
          0,
        ]);

        await budgetApproval.createTransaction([transactionData], Date.now() + 86400, true);

        expect(await WETH.balanceOf(executee.address)).to.eq(parseEther('0.9'));
      });
    });

    context('ETH => tokenA', () => {
      it('should success', async function () {
        
        const functionCallData = uniswapRouter.interface.encodeFunctionData('exactOutputSingle', [[
          ADDRESS_ETH,
          tokenA.address,
          0,
          executee.address,
          200,
          100,
          0,
        ]]);

        const callData = uniswapRouter.interface.encodeFunctionData('multicall(uint256,bytes[])', [
          Date.now() + 86400,
          [functionCallData]
        ])

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_UNISWAP_ROUTER,
          callData,
          100,
        ]);

        await budgetApproval.createTransaction([transactionData], Date.now() + 86400, true);

        expect(await tokenA.balanceOf(executee.address)).to.eq(200);
      });
    });

    context('tokenA => ETH', () => {
      it('should success', async function () {

        await tokenA.mint(executee.address, 200);
        const originalBalance = await ethers.provider.getBalance(executee.address);
        const functionCallData = uniswapRouter.interface.encodeFunctionData('exactOutputSingle', [[
          tokenA.address,
          ADDRESS_ETH,
          0,
          executee.address,
          100,
          200,
          0,
        ]]);

        const callData = uniswapRouter.interface.encodeFunctionData('multicall(uint256,bytes[])', [
          Date.now() + 86400,
          [functionCallData]
        ]);

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_UNISWAP_ROUTER,
          callData,
          0,
        ]);
        await budgetApproval.createTransaction([transactionData], Date.now() + 86400, true);

        expect((await ethers.provider.getBalance(executee.address)).sub(originalBalance)).to.eq(100);
      });
    });

    context('WETH => tokenA', () => {
      it('should success', async function () {
        
        await WETH.mint(executee.address, 100);

        const functionCallData = uniswapRouter.interface.encodeFunctionData('exactOutputSingle', [[
          ADDRESS_WETH,
          tokenA.address,
          0,
          executee.address,
          200,
          100,
          0,
        ]]);

        const callData = uniswapRouter.interface.encodeFunctionData('multicall(uint256,bytes[])', [
          Date.now() + 86400,
          [functionCallData]
        ])

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_UNISWAP_ROUTER,
          callData,
          0,
        ]);

        await budgetApproval.createTransaction([transactionData], Date.now() + 86400, true);

        expect(await tokenA.balanceOf(executee.address)).to.eq(200);
      });
    });

    context('tokenA => WETH', () => {
      it('should success', async function () {

        await tokenA.mint(executee.address, 200);
        const functionCallData = uniswapRouter.interface.encodeFunctionData('exactOutputSingle', [[
          tokenA.address,
          ADDRESS_WETH,
          0,
          executee.address,
          100,
          200,
          0,
        ]]);

        const callData = uniswapRouter.interface.encodeFunctionData('multicall(uint256,bytes[])', [
          Date.now() + 86400,
          [functionCallData]
        ]);

        const transactionData = abiCoder.encode(await budgetApproval.executeParams(), [
          ADDRESS_UNISWAP_ROUTER,
          callData,
          0,
        ]);
        await budgetApproval.createTransaction([transactionData], Date.now() + 86400, true);

        expect(await WETH.balanceOf(executee.address)).to.eq(100);
      });
    });
  });
});
