const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseEther } = ethers.utils;

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('LiquidPool.sol', function () {
  let lp, lpAsSigner1, lpAsSigner2;
  let creator;
  let signer1, signer2;
  let token, token2, tokenAsSigner1, tokenAsSigner2;
  let feedRegistry, dao, memberToken, team;

  beforeEach(async function () {
    [creator, signer1, signer2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: creator });

    const LiquidPool = await ethers.getContractFactory('LiquidPool', { signer: creator });

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);

    const Team = await ethers.getContractFactory('Team', { signer: creator });

    team = await Team.deploy();
    dao = await MockLPDao.deploy();
    token = await MockToken.deploy();
    token2 = await MockToken.deploy();
    memberToken = await MockToken.deploy();

    await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0.0046'));
    await feedRegistry.setPrice(token2.address, ADDRESS_ETH, parseEther('0.0046'));
    await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setAggregator(token2.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setDecimal(token.address, ADDRESS_ETH, 18);
    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    await dao.setMemberToken(memberToken.address);
    await dao.setTeam(team.address);
    await dao.setIsPassAdmissionToken(true);

    lp = await upgrades.deployProxy(LiquidPool, [dao.address, [ADDRESS_ETH, token.address], ADDRESS_ETH], { kind: 'uups' });

    lpAsSigner1 = lp.connect(signer1);
    lpAsSigner2 = lp.connect(signer2);
    tokenAsSigner1 = token.connect(signer1);
    tokenAsSigner2 = token.connect(signer2);

    await ethers.provider.send('hardhat_setBalance', [
      signer1.address,
      parseEther('1000').toHexString(),
    ]);
    await ethers.provider.send('hardhat_setBalance', [
      signer2.address,
      parseEther('1000').toHexString(),
    ]);
  });

  describe('deposit()', function () {
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
      await dao.setIsPassDepositAmount(false);
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('0.99') })).to.be.revertedWith('deposit amount not enough');
    });
    it('throws "Admission token not enough" error without enough minTokenToAdmit amount', async function () {
      await dao.setIsPassAdmissionToken(false);
      await dao.setMinDepositAmount(parseEther('1'));
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('1') })).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('redeem()', function () {
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

  describe('totalPrice()', function () {
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
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0'));
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') }); // 1 ETH
      await tokenAsSigner1.transfer(lp.address, parseEther('1')); // 0 ETH
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') }); // 1.0046 ETH
      expect(await lp.totalPrice()).to.eq(parseEther('2.0046'));
    });
  });

  describe('assetBaseCurrencyPrice()', function () {
    it('returns price based on feed registry', async function () {
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0.0046'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1000'))).to.eq(parseEther('4.6'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('0.0001'))).to.eq(parseEther('0.00000046'));
    });
    it('returns price based on feed registry, even 0 value', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0'));
    });
    it('returns 0 if feed registry returns -1', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('-1'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0'));
    });
  });

  describe('quote()', function () {
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

  describe('depositToken()', function () {
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
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await tokenAsSigner1.transfer(lp.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('2'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('2'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('0.0046'));
    });

    it('mints shares based on pool value, includes ETH & ERC20 Token', async function () {
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
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.not.be.reverted;
    });
    it('throws "deposit amount not enough" error without　enough minDeposit amount', async function () {
      await dao.setIsPassDepositAmount(false);
      await tokenAsSigner1.approve(lp.address, parseEther('0.99'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.99'))).to.be.revertedWith('deposit amount not enough');
    });
    it('throws "Admission token not enough" error without　enough minTokenToAdmit amount', async function () {
      await dao.setIsPassAdmissionToken(false);
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('assetsShares()', function () {
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

  describe('canAddAsset()', function () {
    it('returns true if feed registry resolvable', async function () {
      await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
      expect(await lp.canAddAsset(token.address)).to.eq(true);
    });
    it('returns false if feed registry unresolvable', async function () {
      await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ethers.constants.AddressZero);
      expect(await lp.canAddAsset(token.address)).to.eq(false);
    });
  });

  describe('addAssets()', function () {
    it('emits AllowDepositToken', async function () {
      const tx = await lp.addAssets([token2.address]);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'AllowDepositToken');
      expect(event.args.token).to.eq(token2.address);
      expect(await lp.isAssetSupported(token2.address)).to.eq(true);
    });
  });

  describe('removeAssets()', function () {
    it('emits DisallowDepositToken', async function () {
      await lp.addAssets([token2.address]);
      const tx = await lp.removeAssets([ADDRESS_ETH]);
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'DisallowDepositToken');
      expect(event.args.token).to.eq(ADDRESS_ETH);
      expect(await lp.isAssetSupported(ADDRESS_ETH)).to.eq(false);
      expect(await lp.isAssetSupported(token.address)).to.eq(true);
      expect(await lp.isAssetSupported(token2.address)).to.eq(true);

      await lp.removeAssets([token2.address]);
      expect(await lp.isAssetSupported(ADDRESS_ETH)).to.eq(false);
      expect(await lp.isAssetSupported(token.address)).to.eq(true);
      expect(await lp.isAssetSupported(token2.address)).to.eq(false);
    });
  });
});

describe('LiquidPool.sol - one ERC20 asset only', function () {
  let lp, lpAsSigner1, lpAsSigner2;
  let creator;
  let signer1, signer2;
  let token, tokenAsSigner1, tokenAsSigner2;
  let feedRegistry, dao, memberToken;

  beforeEach(async function () {
    [creator, signer1, signer2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: creator });

    const LiquidPool = await ethers.getContractFactory('LiquidPool', { signer: creator });

    const feedRegistryArticfact = require('../../artifacts/contracts/mocks/MockFeedRegistry.sol/MockFeedRegistry');
    await ethers.provider.send('hardhat_setCode', [
      ADDRESS_MOCK_FEED_REGISTRY,
      feedRegistryArticfact.deployedBytecode,
    ]);
    feedRegistry = await ethers.getContractAt('MockFeedRegistry', ADDRESS_MOCK_FEED_REGISTRY);

    dao = await MockLPDao.deploy();
    token = await MockToken.deploy();
    memberToken = await MockToken.deploy();

    await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0.0046'));
    await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
    await feedRegistry.setDecimal(token.address, ADDRESS_ETH, 18);
    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    await dao.setMemberToken(memberToken.address);
    await dao.setIsPassAdmissionToken(true);
    lp = await upgrades.deployProxy(LiquidPool, [dao.address, [token.address], token.address], { kind: 'uups' });

    lpAsSigner1 = lp.connect(signer1);
    lpAsSigner2 = lp.connect(signer2);
    tokenAsSigner1 = token.connect(signer1);
    tokenAsSigner2 = token.connect(signer2);

    await ethers.provider.send('hardhat_setBalance', [
      signer1.address,
      parseEther('1000').toHexString(),
    ]);
    await ethers.provider.send('hardhat_setBalance', [
      signer2.address,
      parseEther('1000').toHexString(),
    ]);
  });

  describe('depositToken()', function () {
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
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.not.be.reverted;
    });
    it('throws "deposit amount not enough" error without　enough minDeposit amount', async function () {
      await dao.setIsPassDepositAmount(false);
      await tokenAsSigner1.approve(lp.address, parseEther('0.99'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.99'))).to.be.revertedWith('deposit amount not enough');
    });
    it('throws "Admission token not enough" error without　enough minTokenToAdmit amount', async function () {
      await dao.setIsPassAdmissionToken(false);
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('redeem()', function () {
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
  });

  describe('totalPrice()', function () {
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

  describe('assetBaseCurrencyPrice()', function () {
    it('return 1:1 price', async function () {
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1000'))).to.eq(parseEther('1000'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('0.0001'))).to.eq(parseEther('0.0001'));
    });
  });

  describe('quote()', function () {
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

  describe('assetsShares()', function () {
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
