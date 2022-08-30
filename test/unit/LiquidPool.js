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
  let token, tokenAsSigner1, tokenAsSigner2;
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
    memberToken = await MockToken.deploy();

    await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0.0046'));
    await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
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
    it('mint 1 dp if deposit 1 eth (price: 0; totalSupply: 0)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 eth (price: 1.9; totalSupply: 1.9)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('0.1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.9') });
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1.9'));
    });

    it('mint 1 dp for 2 eth (price: 2; totalSupply: 1)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('2') });
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1'));
    });

    it('mint 1 dp for 1.0046 eth (price: 1.0046; totalSupply: 1)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await tokenAsSigner1.transfer(lp.address, parseEther('1'));
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') });
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1'));
    });

    it('can deposit if meet minDeposit amount & minTokenToJoin', async function () {
      await memberToken.mint(signer1.address, parseEther('1'));
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('1') })).to.not.be.reverted;
    });
    it('can not deposit if not meet minDeposit amount', async function () {
      await dao.setIsPassDepositAmount(false);
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('0.99') })).to.be.revertedWith('deposit amount not enough');
    });
    it('can not deposit if not meet minTokenToAdmit amount', async function () {
      await dao.setIsPassAdmissionToken(false);
      await dao.setMinDepositAmount(parseEther('1'));
      await expect(lpAsSigner1.deposit(signer1.address, { value: parseEther('1') })).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('redeem()', function () {
    it('burn 1 dp and redeem 1 eth (totalSupply: 1)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });

      expect(await ethers.provider.getBalance(lp.address)).to.eq(parseEther('1'));
      expect((await ethers.provider.getBalance(signer1.address)).lte(parseEther('999'))).to.eq(true);
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));

      await lpAsSigner1.redeem(parseEther('1'));
      expect(await ethers.provider.getBalance(lp.address)).to.eq(parseEther('0'));
      expect((await ethers.provider.getBalance(signer1.address)).gte(parseEther('999'))).to.eq(true);
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0'));
    });

    it('burn 0.5 dp and redeem 1 eth + .5 token (totalSupply: 1)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      await token.mint(lp.address, parseEther('1'));

      expect(await ethers.provider.getBalance(lp.address)).to.eq(parseEther('2'));
      expect(await token.balanceOf(lp.address)).to.eq(parseEther('1'));
      expect((await ethers.provider.getBalance(signer1.address)).lte(parseEther('999'))).to.eq(true);
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));

      await lpAsSigner1.redeem(parseEther('0.5'));
      expect(await ethers.provider.getBalance(lp.address)).to.eq(parseEther('1'));
      expect(await token.balanceOf(lp.address)).to.eq(parseEther('0.5'));
      expect(await token.balanceOf(signer1.address)).to.eq(parseEther('100.5'));
      expect((await ethers.provider.getBalance(signer1.address)).gte(parseEther('999'))).to.eq(true);
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0.5'));
    });
  });

  describe('totalPrice()', function () {
    it('return price: 0', async function () {
      expect(await lp.totalPrice()).to.eq(0);
    });
    it('return price: 1', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      expect(await lp.totalPrice()).to.eq(parseEther('1'));
    });
    it('return price: 2', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('0.1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.9') });
      expect(await lp.totalPrice()).to.eq(parseEther('2'));
    });

    it('return price: 4', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('2') });
      expect(await lp.totalPrice()).to.eq(parseEther('4'));
    });

    it('return price: 2.0092', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') }); // 1 ETH
      await tokenAsSigner1.transfer(lp.address, parseEther('1')); // 0.0046 ETH
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') }); // 1.0046 ETH
      expect(await lp.totalPrice()).to.eq(parseEther('2.0092'));
    });

    it('return price: 2.0046', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0'));
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') }); // 1 ETH
      await tokenAsSigner1.transfer(lp.address, parseEther('1')); // 0 ETH
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') }); // 1.0046 ETH
      expect(await lp.totalPrice()).to.eq(parseEther('2.0046'));
    });
  });

  describe('assetBaseCurrencyPrice()', function () {
    it('return price: 0.0046 if feedRegistry return 0.0046', async function () {
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0.0046'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1000'))).to.eq(parseEther('4.6'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('0.0001'))).to.eq(parseEther('0.00000046'));
    });
    it('return price: 0 if feedRegistry return 0', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0'));
    });
    it('return price: 0 if feedRegistry return -1', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('-1'));
      expect(await lp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0'));
    });
  });

  describe('quote()', function () {
    it('quote 1 dp if deposit 1 eth (price: 0; totalSupply: 0)', async function () {
      expect(await lp.quote(parseEther('1'))).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 eth (price: 1.9; totalSupply: 1.9)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('0.1') });
      expect(await lp.quote(parseEther('1.9'))).to.eq(parseEther('1.9'));
    });

    it('mint 1 dp for 2 eth (price: 2; totalSupply: 1)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('1') });
      expect(await lp.quote(parseEther('2'))).to.eq(parseEther('1'));
    });

    it('mint 1 dp for 1.0046 eth (price: 1.0046; totalSupply: 1)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('1') });
      await tokenAsSigner1.transfer(lp.address, parseEther('1'));
      await lpAsSigner2.deposit(signer2.address, { value: parseEther('1.0046') });
      expect(await lp.quote(parseEther('1.0046'))).to.eq(parseEther('1'));
      expect(await lp.quote(parseEther('1'))).to.eq(parseEther('0.995421063109695401'));
    });
  });

  describe('depositToken()', function () {
    it('mint 0.0046 dp if deposit 1 TOKEN (price: 0; totalSupply: 0)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('0.0046'));
    });

    it('mint 0.00847 dp for 1.9 TOKEN (price: 0.0046; totalSupply: 0.0046)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('1.9'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('1.9'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('0.00874'));
    });

    it('mint 0.0046 dp for 2 TOKEN (price: 0.0092; totalSupply: 0.0046)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await tokenAsSigner1.transfer(lp.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('2'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('2'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('0.0046'));
    });

    it('mint 0.000255 dp for 12.123 TOKEN (price: 1.0046; totalSupply: 0.0046)', async function () {
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

    it('can deposit if meet minDeposit amount & minTokenToJoin', async function () {
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.not.be.reverted;
    });
    it('can not deposit if not meet minDeposit amount', async function () {
      await dao.setIsPassDepositAmount(false);
      await tokenAsSigner1.approve(lp.address, parseEther('0.99'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.99'))).to.be.revertedWith('deposit amount not enough');
    });
    it('can not deposit if not meet minTokenToAdmit amount', async function () {
      await dao.setIsPassAdmissionToken(false);
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('assetsShares()', function () {
    it('return token amount by ratio of dp balance / totalSupply (tokenA: 100, supply: 100)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });
      await tokenAsSigner1.transfer(lp.address, parseEther('100'));

      expect(await lp.assetsShares(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetsShares(token.address, parseEther('2'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(token.address, parseEther('10'))).to.eq(parseEther('10'));
      expect(await lp.assetsShares(token.address, parseEther('100'))).to.eq(parseEther('100'));
    });
    it('return token amount by ratio of dp balance / totalSupply (tokenA: 12, supply: 100)', async function () {
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
    it('return true if asset can be resolve', async function () {
      await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
      expect(await lp.canAddAsset(token.address)).to.eq(true);
    });
    it('return false if asset can be resolve', async function () {
      await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ethers.constants.AddressZero);
      expect(await lp.canAddAsset(token.address)).to.eq(false);
    });
  });

  describe('assetsShares() of ETH', function () {
    it('return token amount by ratio of dp balance / totalSupply (tokenA: 100, supply: 100)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });

      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('0.00001'))).to.eq(parseEther('0.00001'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('2'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('10'))).to.eq(parseEther('10'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('100'))).to.eq(parseEther('100'));
    });
    it('return token amount by ratio of dp balance / totalSupply (eth: 120, supply: 100)', async function () {
      await lpAsSigner1.deposit(signer1.address, { value: parseEther('100') });
      await creator.sendTransaction({ to: lp.address, value: parseEther('20') });

      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('0.00001'))).to.eq(parseEther('0.000012'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('1'))).to.eq(parseEther('1.2'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('2'))).to.eq(parseEther('2.4'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('10'))).to.eq(parseEther('12'));
      expect(await lp.assetsShares(ADDRESS_ETH, parseEther('100'))).to.eq(parseEther('120'));
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
    it('mint 1 dp if deposit 1 TOKEN (price: 0; totalSupply: 0)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 TOKEN (price: 1.9; totalSupply: 1.9)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('0.1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.1'));

      await tokenAsSigner2.approve(lp.address, parseEther('1.9'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('1.9'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1.9'));
    });

    it('mint 1 dp for 2 TOKEN (price: 2; totalSupply: 1)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      await token.mint(lp.address, parseEther('1'));

      await tokenAsSigner2.approve(lp.address, parseEther('2'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('2'));
      expect(await lp.balanceOf(signer2.address)).to.eq(parseEther('1'));
    });

    it('can deposit if meet minDeposit amount & minTokenToJoin', async function () {
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.not.be.reverted;
    });
    it('can not deposit if not meet minDeposit amount', async function () {
      await dao.setIsPassDepositAmount(false);
      await tokenAsSigner1.approve(lp.address, parseEther('0.99'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.99'))).to.be.revertedWith('deposit amount not enough');
    });
    it('can not deposit if not meet minTokenToAdmit amount', async function () {
      await dao.setIsPassAdmissionToken(false);
      await dao.setMinDepositAmount(parseEther('0.0046'));
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await expect(lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'))).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('redeem()', function () {
    it('burn 1 dp and redeem 1 token (totalSupply: 1)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));

      expect(await lp.balanceOf(signer1.address)).to.eq(parseEther('1'));

      await lpAsSigner1.redeem(parseEther('1'));
      expect(await token.balanceOf(lp.address)).to.eq(parseEther('0'));
      expect(await token.balanceOf(signer1.address)).to.eq(parseEther('100'));
    });
  });

  describe('totalPrice()', function () {
    it('return price: 0', async function () {
      expect(await lp.totalPrice()).to.eq(0);
    });
    it('return price: 1', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      expect(await lp.totalPrice()).to.eq(parseEther('1'));
    });
    it('return price: 2', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('0.1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.1'));
      await tokenAsSigner2.approve(lp.address, parseEther('1.9'));
      await lpAsSigner2.depositToken(signer2.address, token.address, parseEther('1.9'));
      expect(await lp.totalPrice()).to.eq(parseEther('2'));
    });

    it('return price: 4', async function () {
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
    it('quote 1 dp if deposit 1 token (price: 0; totalSupply: 0)', async function () {
      expect(await lp.quote(parseEther('1'))).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 token (price: 1.9; totalSupply: 1.9)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('0.1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('0.1'));
      expect(await lp.quote(parseEther('1.9'))).to.eq(parseEther('1.9'));
    });

    it('mint 1 dp for 2 token (price: 2; totalSupply: 1)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('1'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('1'));
      await token.mint(lp.address, parseEther('1'));
      expect(await lp.quote(parseEther('2'))).to.eq(parseEther('1'));
    });
  });

  describe('assetsShares()', function () {
    it('return token amount by ratio of dp balance / totalSupply (tokenA: 100, supply: 100)', async function () {
      await tokenAsSigner1.approve(lp.address, parseEther('100'));
      await lpAsSigner1.depositToken(signer1.address, token.address, parseEther('100'));

      expect(await lp.assetsShares(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await lp.assetsShares(token.address, parseEther('2'))).to.eq(parseEther('2'));
      expect(await lp.assetsShares(token.address, parseEther('10'))).to.eq(parseEther('10'));
      expect(await lp.assetsShares(token.address, parseEther('100'))).to.eq(parseEther('100'));
    });
  });
});
