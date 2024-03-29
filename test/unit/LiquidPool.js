const chai = require('chai');
const { smock } = require('@defi-wonderland/smock');
const { ethers, upgrades, network, testUtils } = require('hardhat');
const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('LiquidPoolV2.sol - test/unit/LiquidPool.js', async function () {
  let lp, lpAsSigner1, lpAsSigner2, unknown;
  let daoAsSigner;
  let creator;
  let signer1, signer2;
  let token, token2, tokenAsSigner1, tokenAsSigner2, govern, budgetApproval;
  let dao, memberToken, team, accountingSystem;

  beforeEach(async function () {
    [creator, signer1, signer2, unknown] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    dao = await smock.fake('Dao');
    govern = await smock.fake('Govern');
    accountingSystem = await smock.fake('AccountingSystem');
    budgetApproval = await smock.fake('MockBudgetApproval');

    daoAsSigner = await testUtils.address.impersonate(dao.address);

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);

    const Team = await ethers.getContractFactory('Team', { signer: creator });

    team = await Team.deploy();
    token = await MockToken.deploy();
    token2 = await MockToken.deploy();
    memberToken = await MockToken.deploy();

    accountingSystem.isSupportedPair.whenCalledWith(token.address, ADDRESS_ETH).returns(true);
    accountingSystem.isSupportedPair.whenCalledWith(token2.address, ADDRESS_ETH).returns(true);
    accountingSystem.isSupportedPair.whenCalledWith(ADDRESS_ETH, ADDRESS_ETH).returns(true); ;
    accountingSystem.assetPrice.returns(([asset, base, amount]) => { // basic mock asset price return
      if ((asset === token.address && base === ADDRESS_ETH) ||
        (asset === token2.address && base === ADDRESS_ETH)) {
        return amount * parseEther('0.0046') / 10 ** 18;
      } else {
        return amount;
      }
    });

    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    dao.memberToken.returns(memberToken.address);
    dao.team.returns(team.address);
    dao.afterDeposit.returns();
    dao.accountingSystem.returns(accountingSystem.address);
    dao.canCreateBudgetApproval.returns(true);
    dao.memberToken.returns(memberToken.address);
    dao.team.returns(team.address);

    lp = await (await (smock.mock('LiquidPool'))).deploy();
    await lp.setVariables({
      _owner: dao.address,
      assets: [ADDRESS_ETH, token.address],
      _baseCurrency: ADDRESS_ETH,
      _assetIndex: {
        [ADDRESS_ETH]: 1,
        [token.address]: 2,
      },
    });

    lpAsSigner1 = lp.connect(signer1);
    lpAsSigner2 = lp.connect(signer2);
    tokenAsSigner1 = token.connect(signer1);
    tokenAsSigner2 = token.connect(signer2);

    await testUtils.address.setBalance(signer1.address,
      parseEther('1000').toHexString());
    await testUtils.address.setBalance(signer2.address,
      parseEther('1000').toHexString());
    await testUtils.address.setBalance(daoAsSigner.address,
      parseEther('1000').toHexString());
  });
  describe('deposit()', async function () {
    it('mints shares based on ETH price when 0 value in pool', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));
    });

    it('mints shares based on pool price', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('0.1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.9') });
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1.9'));
    });

    it('mints shares based on pool price, even 1 ETH != 1 shares', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('2') });
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1'));
    });

    it('mints shares based on pool price, includes ERC20 token price', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await tokenAsSigner1.transfer(lp.address, parseEther('1'));
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') });
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1'));
    });

    it('allows eoa to deposit with enough minDeposit amount & minTokenToJoin', async function () {
      await memberToken.mint(signer1.address, parseEther('1'));
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('1') })).to.not.be.reverted;
    });
    it('throws "deposit amount not enough" error without enough minDeposit amount', async function () {
      dao.afterDeposit.reverts('deposit amount not enough');
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('0.99') })).to.be.reverted;
    });
  });

  describe('redeem()', async function () {
    describe('redeem all assets', async function () {
      beforeEach(async function () {
        await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
        await lpAsSigner1.redeem(parseEther('1'));
      });
      it('payouts ETH to EOA', async function () {
        expect((await ethers.provider.getBalance(signer1.address)).gte(parseEther('999'))).to.eq(true);
      });
      it('burns shares of EOA', async function () {
        expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0'));
      });
      it('remains no asset', async function () {
        expect(await ethers.provider.getBalance(lp.address)).to.eq(parseEther('0'));
      });
    });

    describe('redeem partial assets', async function () {
      beforeEach(async function () {
        await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
        await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
        await token.mint(lp.address, parseEther('1'));
        await lpAsSigner1.redeem(parseEther('0.5'));
      });

      it('payouts ETH & ERC20 token to EOA', async function () {
        expect((await ethers.provider.getBalance(signer1.address)).gte(parseEther('999'))).to.eq(true);
        expect(await token.balanceOf(signer1.address)).to.eq(parseEther('100.5'));
      });

      it('burns shares of EOA', async function () {
        expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0.5'));
      });

      it('remains partial assets', async function () {
        expect(await token.balanceOf(lp.address)).to.eq(parseEther('0.5'));
        expect(await ethers.provider.getBalance(lp.address)).to.eq(parseEther('1'));
      });
    });
  });

  describe('totalPrice()', async function () {
    it('default returns 0', async function () {
      expect(await lp.totalPrice()).to.eq(0);
    });
    it('answers correctly after one deposits', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      expect(await lp.totalPrice()).to.eq(parseEther('1'));
    });
    it('answers correctly after 2 deposits', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('0.1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.9') });
      expect(await lp.totalPrice()).to.eq(parseEther('2'));
    });

    it('answers correctly after unknown airdrop', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('2') });
      expect(await lp.totalPrice()).to.eq(parseEther('4'));
    });

    it('answers correctly with different token deposit', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') }); // 1 ETH
      await tokenAsSigner1.transfer(lp.address, parseEther('1')); // 0.0046 ETH
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') }); // 1.0046 ETH
      expect(await lp.totalPrice()).to.eq(parseEther('2.0092'));
    });

    it('answers correctly with different token deposit, according to feed resolver price', async function () {
      accountingSystem.assetPrice.whenCalledWith(token.address, ADDRESS_ETH, parseEther('1')).returns(0);
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') }); // 1 ETH
      await tokenAsSigner1.transfer(lp.address, parseEther('1')); // 0 ETH
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') }); // 1.0046 ETH
      expect(await lp.totalPrice()).to.eq(parseEther('2.0046'));
    });
  });

  describe('assetBaseCurrencyPrice()', async function () {
    it('redirect call to accountingSystem correcly if accountingSystem support the pair', async function () {
      await lp.assetBaseCurrencyPrice(token.address, parseEther('1'));
      expect(accountingSystem.isSupportedPair).to.have.been.calledWith(token.address, ADDRESS_ETH);
      expect(accountingSystem.assetPrice).to.have.been.calledWith(token.address, ADDRESS_ETH, parseEther('1'));
    });
  });

  describe('quote()', async function () {
    it('quotes shares based on ETH value if 0 value in pool', async function () {
      expect(await lp.quote(parseEther('1'))).to.eq(parseEther('1'));
    });

    it('quotes shares based on pool value', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('0.1') });
      expect(await lp.quote(parseEther('1.9'))).to.eq(parseEther('1.9'));
    });

    it('quotes shares based on pool value, even 1 ETH != 1 shares', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      expect(await lp.quote(parseEther('2'))).to.eq(parseEther('1'));
    });

    it('quotes shares based on pool value, includes ETH & ERC20 Token', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await tokenAsSigner1.transfer(lp.address, parseEther('1'));
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') });
      expect(await lp.quote(parseEther('1.0046'))).to.eq(parseEther('1'));
      expect(await lp.quote(parseEther('1'))).to.eq(parseEther('0.995421063109695401'));
    });
  });

  describe('depositToken()', async function () {
    beforeEach(async function () {
      accountingSystem.assetPrice.whenCalledWith(token.address, ADDRESS_ETH, parseEther('1')).returns(parseEther('0.0046'));
    });
    it('mints shares based on ERC20 <=> ETH price if 0 value in pool', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0.0046'));
    });

    it('mints shares based on pool value', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('1.9'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('1.9'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('0.00874'));
    });

    it('mints shares based on pool value, even 1 ETH != 1 shares', async function () {
      accountingSystem.assetPrice.whenCalledWith(token.address, ADDRESS_ETH, parseEther('2')).returns(parseEther('0.0092'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await tokenAsSigner1.transfer(lp.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('2'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('2'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('0.0046'));
    });

    it('mints shares based on pool value, includes ETH & ERC20 Token', async function () {
      accountingSystem.assetPrice.whenCalledWith(token.address, ADDRESS_ETH, parseEther('12.123')).returns(parseEther('0.0557658'));

      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      await tokenAsSigner2.approve(lp.address, parseEther('12.123'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('12.123'));

      // LP price = 1.0046 / 0.0046 = ~218 eth per LP
      // TOKEN price = 12.123 * 0.0046 = ~0.055 eth
      // Quote = 0.055 / 218 = ~0.000255 eth
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('0.000255348078837348'));
    });

    it('allows eoa to deposit with enough minDeposit amount & minTokenToJoin', async function () {
      dao.minDepositAmount.returns(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.not.be.reverted;
    });
    it('throws "Asset not support" error when using unknown token', async function () {
      await memberToken.approve(lp.address, 1);
      await expect(lpAsSigner1.depositToken(signer1.address, memberToken.address, 1)).to.be.revertedWithCustomError(lp, 'UnsupportedAsset');
    });
    it('throws "deposit amount not enough" error without　enough minDeposit amount', async function () {
      await dao.afterDeposit.reverts('deposit amount not enough');
      await tokenAsSigner1.approve(lp.address, parseEther('0.99'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.99'))).to.be.reverted;
    });
    it('throws "InsufficientAdmissionToken" error without　enough minTokenToAdmit amount', async function () {
      await dao.afterDeposit.reverts('InsufficientAdmissionToken');
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.be.reverted;
    });
  });
  describe('totalPriceInEth()', async function () {
    it('returns price in eth', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await signer1.sendTransaction({ to: lp.address, value: parseEther('1') });
      expect(await lp.totalPriceInNativeToken()).to.eq(parseEther('1'));

      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.totalPriceInNativeToken()).to.eq(parseEther('1.0046'));
    });
  });
  describe('createBudgetApproval()', async function () {
    it('allows to create whitelisted BudgetApproval', async function () {
      await dao.canCreateBudgetApproval.returns(true);
      await expect(lpAsSigner1.connect(daoAsSigner).createBudgetApprovals([budgetApproval.address], [budgetApproval.interface.encodeFunctionData('initialize', [
        [
          signer1.address, // executor
          0, // executorTeam
          [], // approvers
          0, // approverTeam
          0, // minApproval
          'Transfer Liquid ERC20', // text
          'outflowLiquid', // transaction type
          0, // startTime
          0, // endTime
          false, // allow unlimited usage
          10, // usage count
        ],
      ])])).to.not.be.reverted;
    });
    it('disallows to create non whitelisted BudgetApproval', async function () {
      await dao.canCreateBudgetApproval.returns(false);
      await expect(lpAsSigner1.connect(daoAsSigner).createBudgetApprovals([budgetApproval.address], [budgetApproval.interface.encodeFunctionData('initialize', [
        [
          signer1.address, // executor
          0, // executorTeam
          [], // approvers
          0, // approverTeam
          0, // minApproval
          'Transfer Liquid ERC20', // text
          'outflowLiquid', // transaction type
          0, // startTime
          0, // endTime
          false, // allow unlimited usage
          10, // usage count
        ],
      ])])).to.be.revertedWithCustomError(lp, 'TemplateNotWhitelisted');
    });
  });
  describe('assetsShares()', async function () {
    it('return ETH amount by ratio of dp balance over totalSupply', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });

      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('0.00001'))).to.eq(parseEther('0.00001'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('2'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('10'))).to.eq(parseEther('10'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('100'))).to.eq(parseEther('100'));
    });
    it('return ETH amount by ratio of dp balance over totalSupply', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('20') });

      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('0.00001'))).to.eq(parseEther('0.000012'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1.2'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('2'))).to.eq(parseEther('2.4'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('10'))).to.eq(parseEther('12'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('100'))).to.eq(parseEther('120'));
    });
    it('return ERC20 token amount by ratio of dp balance over totalSupply', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });
      await tokenAsSigner1.transfer(lp.address, parseEther('100'));

      expect(await lp.assetsShares(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetsShares(token.address, parseEther('2'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(token.address, parseEther('10'))).to.eq(parseEther('10'));
      expect(await lp.assetsShares(token.address, parseEther('100'))).to.eq(parseEther('100'));
    });
    it('return ERC20 token amount by ratio of dp balance over totalSupply, even 1 ETH != 1 shares', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });
      await tokenAsSigner1.transfer(lp.address, parseEther('12'));

      expect(await lp.assetsShares(token.address, parseEther('0.00001'))).to.eq(parseEther('0.0000012'));
      expect(await lp.assetsShares(token.address, parseEther('1'))).to.eq(parseEther('0.12'));
      expect(await lp.assetsShares(token.address, parseEther('2'))).to.eq(parseEther('0.24'));
      expect(await lp.assetsShares(token.address, parseEther('10'))).to.eq(parseEther('1.2'));
      expect(await lp.assetsShares(token.address, parseEther('100'))).to.eq(parseEther('12'));
    });
  });

  describe('canAddAsset()', async function () {
    it('returns true if feed registry resolvable', async function () {
      expect(await lp.canAddAsset(token.address)).to.eq(true);
    });
    it('returns false if feed registry unresolvable', async function () {
      accountingSystem.isSupportedPair.whenCalledWith(token.address, ADDRESS_ETH).returns(false);
      expect(await lp.canAddAsset(token.address)).to.eq(false);
    });
    it('throws "Dao: only Govern" errors if non govern called', async function () {
      await expect(lp.addAssets([token2.address])).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('addAssets()', async function () {
    it('emits AllowDepositToken', async function () {
      const tx = await lp.connect(daoAsSigner).addAssets([token2.address]);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'AllowDepositToken');
      expect(event.args.token).to.eq(token2.address);
      expect(await lp.isAssetSupported(token2.address)).to.eq(true);
    });
    it('throws "Asset not support" errors if token duplicated', async function () {
      await lp.connect(daoAsSigner).addAssets([token2.address]);
      await expect(lp.connect(daoAsSigner).addAssets([token2.address])).to.be.revertedWithCustomError(lp, 'AssetAlreadyAdded');
    });
    it('throws "Asset not support" errors if token cannot resolve price', async function () {
      await expect(lp.connect(daoAsSigner).addAssets([memberToken.address])).to.be.revertedWithCustomError(lp, 'UnsupportedAsset');
    });
  });

  describe('removeAssets()', async function () {
    it('emits DisallowDepositToken', async function () {
      await testUtils.address.setBalance(daoAsSigner.address, parseEther('1'));
      await lp.connect(daoAsSigner).addAssets([token2.address]);
      const tx = await lp.connect(daoAsSigner).removeAssets([ADDRESS_ETH]);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'DisallowDepositToken');
      expect(event.args.token).to.eq(ADDRESS_ETH);
      expect(await lp.isAssetSupported(ADDRESS_ETH)).to.eq(false);
      expect(await lp.isAssetSupported(token.address)).to.eq(true);
      expect(await lp.isAssetSupported(token2.address)).to.eq(true);

      await lp.connect(daoAsSigner).removeAssets([token2.address]);
      expect(await lp.isAssetSupported(ADDRESS_ETH)).to.eq(false);
      expect(await lp.isAssetSupported(token.address)).to.eq(true);
      expect(await lp.isAssetSupported(token2.address)).to.eq(false);
    });
    it('throws "Ownable: caller is not the owner" errors if non govern called', async function () {
      await expect(lp.removeAssets([ADDRESS_ETH])).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('assetsLength()', async function () {
    it('return assets length', async function () {
      expect(await lp.assetsLength()).to.eq(ethers.BigNumber.from('2'));
    });
  });
});

describe('LiquidPool.sol - one ERC20 asset only', async function () {
  let lp, lpAsSigner1, lpAsSigner2;
  let creator;
  let signer1, signer2;
  let token, tokenAsSigner1, tokenAsSigner2, govern;
  let dao, memberToken, team, accountingSystem, daoAsSigner;

  beforeEach(async function () {
    [creator, signer1, signer2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    dao = await smock.fake('Dao');
    govern = await smock.fake('Govern');
    accountingSystem = await smock.fake('AccountingSystem');

    daoAsSigner = await testUtils.address.impersonate(dao.address);

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);

    const Team = await ethers.getContractFactory('Team', { signer: creator });

    team = await Team.deploy();
    token = await MockToken.deploy();
    memberToken = await MockToken.deploy();

    accountingSystem.isSupportedPair.whenCalledWith(token.address, token.address).returns(true);
    accountingSystem.assetPrice.returns(([asset, base, amount]) => { // basic mock asset price return
      if (asset === token.address && base === ADDRESS_ETH) {
        return amount * parseEther('0.0046') / 10 ** 18;
      } else {
        return amount;
      }
    });

    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    dao.memberToken.returns(memberToken.address);
    dao.team.returns(team.address);
    dao.afterDeposit.returns();
    dao.accountingSystem.returns(accountingSystem.address);
    dao.canCreateBudgetApproval.returns(true);
    dao.memberToken.returns(memberToken.address);
    dao.team.returns(team.address);

    lp = await (await (smock.mock('LiquidPool'))).deploy();
    await lp.setVariables({
      _owner: dao.address,
      assets: [token.address],
      _baseCurrency: token.address,
      _assetIndex: {
        [token.address]: 2,
      },
    });
    lpAsSigner1 = lp.connect(signer1);
    lpAsSigner2 = lp.connect(signer2);
    tokenAsSigner1 = token.connect(signer1);
    tokenAsSigner2 = token.connect(signer2);

    await testUtils.address.setBalance(signer1.address,
      parseEther('1000').toHexString());
    await testUtils.address.setBalance(signer2.address,
      parseEther('1000').toHexString());
    await testUtils.address.setBalance(daoAsSigner.address,
      parseEther('1000').toHexString());
  });

  describe('depositToken()', async function () {
    it('mints shares based on ERC20 token amount when 0 value in pool', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));
    });

    it('mints shares based on pool price', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('0.1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.1'));

      await tokenAsSigner2.approve(lp.address, parseEther('1.9'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('1.9'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1.9'));
    });

    it('mints shares based on pool price, even 1 Token != 1 shares', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await token.mint(lp.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('2'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('2'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1'));
    });

    it('allows eoa to deposit with enough minDeposit amount & minTokenToJoin', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.not.be.reverted;
    });
    it('throws "deposit amount not enough" error without　enough minDeposit amount', async function () {
      await dao.afterDeposit.reverts('deposit amount not enough');
      await tokenAsSigner1.approve(lp.address, parseEther('0.99'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.99'))).to.be.reverted;
    });
    it('throws "InsufficientAdmissionToken" error without　enough minTokenToAdmit amount', async function () {
      await dao.afterDeposit.reverts('InsufficientAdmissionToken');
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.be.reverted;
    });
  });

  describe('redeem()', async function () {
    describe('redeem all assets', async function () {
      beforeEach(async function () {
        await tokenAsSigner1.approve(lp.address, parseEther('1'));
        await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
        await lpAsSigner1.redeem(parseEther('1'));
      });
      it('payouts ETH to EOA', async function () {
        expect(await token.balanceOf(signer1.address)).to.eq(parseEther('100'));
      });
      it('burns shares of EOA', async function () {
        expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0'));
      });
      it('remains no asset', async function () {
        expect(await token.balanceOf(lp.address)).to.eq(parseEther('0'));
      });
    });

    describe('redeem partial assets', async function () {
      beforeEach(async function () {
        await tokenAsSigner1.approve(lp.address, parseEther('1'));
        await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
        await token.mint(lp.address, parseEther('1'));
        await lpAsSigner1.redeem(parseEther('0.5'));
      });

      it('payouts ETH & ERC20 token to EOA', async function () {
        expect(await token.balanceOf(signer1.address)).to.eq(parseEther('100'));
      });

      it('burns shares of EOA', async function () {
        expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0.5'));
      });

      it('remains partial assets', async function () {
        expect(await token.balanceOf(lp.address)).to.eq(parseEther('1'));
      });
    });
    describe('throws "not enough balance" error ', async function () {
      it('if redeem eth more than eoa can', async function () {
        await tokenAsSigner1.approve(lp.address, parseEther('1'));
        await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
        await lpAsSigner1.redeem(parseEther('1'));
        await expect(lpAsSigner1.redeem(parseEther('1.1'))).to.revertedWithCustomError(lp, 'InvalidAmount');
      });
      it('if redeem mixed token more than eoa can', async function () {
        await tokenAsSigner1.approve(lp.address, parseEther('1'));
        await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
        await token.mint(lp.address, parseEther('1'));
        await lpAsSigner1.redeem(parseEther('0.5'));
        await expect(lpAsSigner1.redeem(parseEther('1.6'))).to.revertedWithCustomError(lp, 'InvalidAmount');
      });
    });
  });

  describe('totalPrice()', async function () {
    it('default returns 0', async function () {
      expect(await lp.totalPrice()).to.eq(0);
    });
    it('answers correctly after one deposits', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.totalPrice()).to.eq(parseEther('1'));
    });
    it('answers correctly after 2 deposits', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('0.1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.1'));
      await tokenAsSigner2.approve(lp.address, parseEther('1.9'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('1.9'));
      expect(await lp.totalPrice()).to.eq(parseEther('2'));
    });

    it('answers correctly after unknown airdrop', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await token.mint(lp.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('2'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('2'));

      expect(await lp.totalPrice()).to.eq(parseEther('4'));
    });
  });

  describe('assetBaseCurrencyPrice()', async function () {
    it('return 1:1 price', async function () {
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1000'))).to.eq(parseEther('1000'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('0.0001'))).to.eq(parseEther('0.0001'));
    });
  });

  describe('quote()', async function () {
    it('quotes shares based on token amount if 0 value in pool', async function () {
      expect(await lp.quote(parseEther('1'))).to.eq(parseEther('1'));
    });

    it('quotes shares based on pool value', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('0.1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.1'));
      expect(await lp.quote(parseEther('1.9'))).to.eq(parseEther('1.9'));
    });

    it('quotes shares based on pool value, even 1 Token != 1 shares', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      await token.mint(lp.address, parseEther('1'));
      expect(await lp.quote(parseEther('2'))).to.eq(parseEther('1'));
    });
  });

  describe('assetsShares()', async function () {
    it('return ERC20 token amount by ratio of dp balance over totalSupply', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('100'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('100'));

      expect(await lp.assetsShares(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetsShares(token.address, parseEther('2'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(token.address, parseEther('10'))).to.eq(parseEther('10'));
      expect(await lp.assetsShares(token.address, parseEther('100'))).to.eq(parseEther('100'));
    });
    it('return ERC20 token amount by ratio of dp balance over totalSupply, even 1 Token != 1 shares', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('100'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('100'));
      await token.mint(lp.address, parseEther('100'));

      expect(await lp.assetsShares(token.address, parseEther('0.00001'))).to.eq(parseEther('0.00002'));
      expect(await lp.assetsShares(token.address, parseEther('1'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(token.address, parseEther('2'))).to.eq(parseEther('4'));
      expect(await lp.assetsShares(token.address, parseEther('10'))).to.eq(parseEther('20'));
      expect(await lp.assetsShares(token.address, parseEther('100'))).to.eq(parseEther('200'));
    });
  });
});
