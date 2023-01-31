const chai = require('chai');
const { ethers, network } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
const { BigNumber } = ethers;
chai.should();
chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

describe('DepositRewardBudgetApproval.sol - test/unit/v2/DepositRewardBudgetApproval.js', async function () {
  let creator, executor, referee, referrer;
  let executee, depositToken;
  let executeeAsSigner, DepositRewardBudgetApproval, ERC1967Proxy, depositRewardBAImpl, team;

  let liquidPool, dao, membership, rewardToken;

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
    params.liquidPool,
    params.token,
    params.allowAnyAmount !== undefined ? params.allowAnyAmount : true,
    params.totalAmount || 0,
    params.referrerRewardAmount || 0,
    params.refereeRewardAmount || 0,
    ];
  }

  function encodeTxData (receiver, asset, amount, referrer) {
    return abiCoder.encode(['address receiver', 'address asset', 'uint256 amount', 'uint256 referrer'], [
      receiver,
      asset,
      amount,
      referrer,
    ]);
  }

  function encodeTransferData (to, amount) {
    return rewardToken.interface.encodeFunctionData('transfer', [
      to,
      amount,
    ]);
  }

  beforeEach(async function () {
    [creator, executor, referee, referrer] = await ethers.getSigners();

    liquidPool = await smock.fake('LiquidPool');
    dao = await smock.fake('Dao');
    membership = await smock.fake('Membership');

    liquidPool.owner.returns(dao.address);
    dao.membership.returns(membership.address);

    executee = await smock.fake('MockBudgetApprovalExecutee');
    rewardToken = await smock.fake('ERC20');
    team = await smock.fake('Team');
    executee.team.returns(team.address);

    depositToken = await smock.fake('ERC20');

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
    DepositRewardBudgetApproval = await ethers.getContractFactory('DepositRewardBudgetApproval', { signer: executeeAsSigner });
    ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', { signer: executeeAsSigner });

    depositRewardBAImpl = await DepositRewardBudgetApproval.deploy();
  });

  describe('initialize()', async function () {
    it('init with params with the least setting successfully', async () => {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
        })));
      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);

      expect(await depositRewardBA.name()).to.be.eq('Deposit Reward Budget Approval');
      expect(await depositRewardBA.token()).to.be.eq(rewardToken.address);
      expect(await depositRewardBA.liquidPool()).to.be.eq(liquidPool.address);
      expect(await depositRewardBA.allowAnyAmount()).to.be.eq(true);
      expect(await depositRewardBA.totalAmount()).to.be.eq(ethers.BigNumber.from('0'));
      expect(await depositRewardBA.referrerRewardAmount()).to.be.eq(ethers.BigNumber.from('0'));
      expect(await depositRewardBA.refereeRewardAmount()).to.be.eq(ethers.BigNumber.from('0'));
      expect(await depositRewardBA.text()).to.be.eq('text');
      expect(await depositRewardBA.transactionType()).to.be.eq('transactionType');
    });
    it('init with params with complex setting successfully', async () => {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: ethers.BigNumber.from('1000'),
          referrerRewardAmount: 1,
          refereeRewardAmount: 2,
        })));
      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);

      expect(await depositRewardBA.name()).to.be.eq('Deposit Reward Budget Approval');
      expect(await depositRewardBA.token()).to.be.eq(rewardToken.address);
      expect(await depositRewardBA.allowAnyAmount()).to.be.eq(false);
      expect(await depositRewardBA.totalAmount()).to.be.eq(ethers.BigNumber.from('1000'));
      expect(await depositRewardBA.referrerRewardAmount()).to.be.eq(ethers.BigNumber.from('1'));
      expect(await depositRewardBA.refereeRewardAmount()).to.be.eq(ethers.BigNumber.from('2'));
    });
    it('throws "Duplicated address in target address list" error if toAddresses duplicated', async () => {
      await expect(ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: ethers.constants.AddressZero,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: ethers.BigNumber.from('1000'),
          referrerRewardAmount: 1,
          refereeRewardAmount: 2,
        })))).to.be.revertedWithCustomError(depositRewardBAImpl, 'InvalidContract');
      await expect(ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: creator.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: ethers.BigNumber.from('1000'),
          referrerRewardAmount: 1,
          refereeRewardAmount: 2,
        })))).to.be.revertedWithCustomError(depositRewardBAImpl, 'InvalidContract');
    });
    it('throws "invalid liquidPool', async () => {
      await expect(ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: ethers.constants.AddressZero,
          allowAnyAmount: false,
          totalAmount: ethers.BigNumber.from('1000'),
          referrerRewardAmount: 1,
          refereeRewardAmount: 2,
        })))).to.be.revertedWithCustomError(depositRewardBAImpl, 'InvalidContract');
    });
  });

  describe('executeParams()', async function () {
    let depositRewardBA;
    beforeEach(async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
        })));
      depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
    });
    it('describes execute params', async function () {
      expect(await depositRewardBA.executeParams()).to.be.deep.equal(['address receiver', 'address asset', 'uint256 amount', 'address referrer']);
    });
  });

  describe('execute()', async function () {
    beforeEach(async function () {
      executee.executeByBudgetApproval.returns('0x');
    });
    it('issues depositReward if depositReward > 0', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: 100,
          referrerRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, depositToken.address, 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

      executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
        rewardToken.address,
        encodeTransferData(referrer.address, 4),
        BigNumber.from('0'));
    });

    it('issues refereeReward if refereeReward > 0', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: 100,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, depositToken.address, 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

      expect(await depositRewardBA.totalAmount()).to.deep.eq(BigNumber.from('96'));

      executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
        rewardToken.address,
        encodeTransferData(referee.address, 4),
        BigNumber.from('0'));
    });
    it('issues both reward if > 0', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: 7,
          referrerRewardAmount: 3,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, depositToken.address, 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

      expect(await depositRewardBA.totalAmount()).to.deep.eq(BigNumber.from('0'));

      executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
        rewardToken.address,
        encodeTransferData(referrer.address, 3),
        BigNumber.from('0'));
      executee.executeByBudgetApproval.atCall(1).should.be.calledWith(
        rewardToken.address,
        encodeTransferData(referee.address, 4),
        BigNumber.from('0'));
    });

    it('stop issues if supply not enough', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: false,
          totalAmount: 6,
          referrerRewardAmount: 3,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, depositToken.address, 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWithCustomError(depositRewardBA, 'InsufficientSupply');
    });

    it('deposits Tokens to LP', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: true,
          referrerRewardAmount: 3,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, depositToken.address, 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

      liquidPool.depositToken.should.be.calledWith(
        referee.address, depositToken.address, BigNumber.from('1000'));
    });

    it('deposits ETH to LP', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: true,
          referrerRewardAmount: 3,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', BigNumber.from('1000'), referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '', { value: BigNumber.from('1000') })).to.not.be.reverted;

      liquidPool.deposit.should.be.calledWith(referee.address);
      liquidPool.deposit.should.be.calledWithValue(BigNumber.from('1000'));

      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', BigNumber.from('1000'), referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '', { value: BigNumber.from('1001') })).to.be.revertedWithCustomError(depositRewardBA, 'MsgValueNotMatch');
    });

    it('blocks members if joined before', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: true,
          referrerRewardAmount: 3,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      membership.isMember.returns(true);
      membership.wasMember.returns(false);
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '', { value: 1000 })).to.be.revertedWithCustomError(depositRewardBA, 'NotQualify');
    });

    it('blocks members if quit before', async function () {
      const contract = await ERC1967Proxy.deploy(
        depositRewardBAImpl.address,
        DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
          token: rewardToken.address,
          liquidPool: liquidPool.address,
          allowAnyAmount: true,
          referrerRewardAmount: 3,
          refereeRewardAmount: 4,
        })));

      const depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
      executee.executeByBudgetApproval.returns('0x');
      membership.isMember.returns(false);
      membership.wasMember.returns(true);
      await expect(depositRewardBA.connect(referee).createTransaction([
        encodeTxData(referee.address, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 1000, referrer.address),
      ], Math.round(Date.now() / 1000) + 86400, true, '', { value: 1000 })).to.be.revertedWithCustomError(depositRewardBA, 'NotQualify');
    });

    // context('allow limited absolute amount', async function () {
    //   let depositRewardBA;
    //   beforeEach(async function () {
    //     const contract = await ERC1967Proxy.deploy(
    //       depositRewardBAImpl.address,
    //       DepositRewardBudgetApproval.interface.encodeFunctionData('initialize', initializeParser({
    //         allowAllToAddresses: true,
    //         toAddresses: [],
    //         allowAllTokens: true,
    //         token: ethers.constants.AddressZero,
    //         allowAnyAmount: false,
    //         totalAmount: 100,
    //       })));
    //     depositRewardBA = await ethers.getContractAt('DepositRewardBudgetApproval', contract.address);
    //     executee.executeByBudgetApproval.returns('0x');
    //   });

    //   it('allows user to transfer under allow amount', async function () {
    //     await expect(depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 50),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

    //     executee.executeByBudgetApproval.atCall(0).should.be.calledWith(
    //       mockToken.address,
    //       encodeTransferData(receiver.address, 50),
    //       BigNumber.from('0'));
    //   });

    //   it('allows user to transfer equal allow amount', async function () {
    //     await expect(depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 100),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
    //   });

    //   it('allows user to transfer amount twice', async function () {
    //     await expect(depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 50),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;

    //     await expect(depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 50),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '')).to.not.be.reverted;
    //   });

    //   it('throws "Exceeded max budget transferable amount" error if the 1st time outflow exceeds amount limit', async function () {
    //     await expect(depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 101),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Exceeded max budget transferable amount');
    //   });

    //   it('throws "Exceeded max budget transferable amount" error if the 2nd time outflow exceeds amount limit', async function () {
    //     await depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 50),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '');

    //     await expect(depositRewardBA.connect(executor).createTransaction([
    //       encodeTxData(mockToken.address, receiver.address, 51),
    //     ], Math.round(Date.now() / 1000) + 86400, true, '')).to.be.revertedWith('Exceeded max budget transferable amount');
    //   });
    // });

  });
});
