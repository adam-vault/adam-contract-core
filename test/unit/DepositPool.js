const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { parseEther } = ethers.utils;
const decodeBase64 = require('../utils/decodeBase64');

const {
  ADDRESS_ETH,
  ADDRESS_MOCK_AGGRGATOR,
  ADDRESS_MOCK_FEED_REGISTRY,
} = require('../utils/constants');

describe('DepositPool.sol', function () {
  let dp, dpAsSigner1, dpAsSigner2;
  let creator;
  let signer1, signer2;
  let token, tokenAsSigner1, tokenAsSigner2;
  let feedRegistry, dao, memberToken;

  beforeEach(async function () {
    [creator, signer1, signer2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: creator });

    const DepositPool = await ethers.getContractFactory('DepositPool', { signer: creator });

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
    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    await dao.setMemberToken(memberToken.address);
    await dao.setAdmissionToken(memberToken.address);
    await dao.setMinTokenToAdmit(0);
    dp = await upgrades.deployProxy(DepositPool, [dao.address, [token.address, ADDRESS_ETH], ADDRESS_ETH], { kind: 'uups' });

    dpAsSigner1 = dp.connect(signer1);
    dpAsSigner2 = dp.connect(signer2);
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

  describe('name()', function () {
    it('return ETH if 0xeeee', async function () {
      expect(await dp.name(ADDRESS_ETH)).to.eq('ETH');
    });
    it('return token name', async function () {
      expect(await dp.name(token.address)).to.eq('TokenA');
    });
  });

  describe('decimals()', function () {
    it('return ETH if 0xeeee', async function () {
      expect(await dp.decimals(ADDRESS_ETH)).to.eq(18);
    });
    it('return token name', async function () {
      expect(await dp.decimals(token.address)).to.eq(18);
    });
  });

  describe('uri()', function () {
    it('return ETH if 0xeeee', async function () {
      const jsonResponse = decodeBase64(await dp.uri(await dpAsSigner1.idOf(ADDRESS_ETH)));
      expect(jsonResponse.name).to.equal('ETH');
    });
    it('return token name', async function () {
      const jsonResponse = decodeBase64(await dp.uri(await dpAsSigner1.idOf(token.address)));
      expect(jsonResponse.name).to.equal('TokenA');
    });
  });

  describe('assetBaseCurrencyPrice()', function () {
    it('return price: 0.0046 if feedRegistry return 0.0046', async function () {
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0.0046'));
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('1000'))).to.eq(parseEther('4.6'));
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('0.0001'))).to.eq(parseEther('0.00000046'));
    });
    it('return price: 0 if feedRegistry return 0', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('0'));
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0'));
    });
    it('return price: 0 if feedRegistry return -1', async function () {
      await feedRegistry.setPrice(token.address, ADDRESS_ETH, parseEther('-1'));
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('0'));
    });
  });

  describe('canAddAsset()', function () {
    it('return true if asset can be resolve', async function () {
      await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR);
      expect(await dp.canAddAsset(token.address)).to.eq(true);
    });
    it('return false if asset can be resolve', async function () {
      await feedRegistry.setAggregator(token.address, ADDRESS_ETH, ethers.constants.AddressZero);
      expect(await dp.canAddAsset(token.address)).to.eq(false);
    });
  });

  describe('deposit()', function () {
    it('mint 1 dp if deposit 1 eth (price: 0; totalSupply: 0)', async function () {
      await dpAsSigner1.deposit({ value: parseEther('1') });
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(ADDRESS_ETH))).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 eth (price: 1.9; totalSupply: 1.9)', async function () {
      await dpAsSigner1.deposit({ value: parseEther('0.1') });
      await dpAsSigner2.deposit({ value: parseEther('1.9') });

      expect(await dp.balanceOf(signer2.address, await dpAsSigner1.idOf(ADDRESS_ETH))).to.eq(parseEther('1.9'));
    });

    it('can deposit twice if not deposit before', async function () {
      expect(await dao.isMember(signer1.address)).to.eq(false);
      expect(await dao.firstDepositTime(signer1.address)).to.eq(0);

      await dpAsSigner1.deposit({ value: parseEther('1') });
      await dpAsSigner1.deposit({ value: parseEther('1') });
      expect(await dao.isMember(signer1.address)).to.eq(true);
      expect(await dao.firstDepositTime(signer1.address)).to.not.eq(0);
    });

    it('can deposit if already is a member', async function () {
      await dao.mintMember(signer1.address);
      expect(await dao.isMember(signer1.address)).to.eq(true);
      expect(await dao.firstDepositTime(signer1.address)).to.eq(0);

      await dpAsSigner1.deposit({ value: parseEther('1') });
      expect(await dao.isMember(signer1.address)).to.eq(true);
      expect(await dao.firstDepositTime(signer1.address)).to.not.eq(0);
    });

    it('can deposit if meet minDeposit amount & minTokenToJoin', async function () {
      await dao.setMinTokenToAdmit(parseEther('1'));
      await dao.setMinDepositAmount(parseEther('1'));
      await memberToken.mint(signer1.address, parseEther('1'));
      await expect(dpAsSigner1.deposit({ value: parseEther('1') })).to.not.be.reverted;
    });
    it('can not deposit if not meet minDeposit amount', async function () {
      await dao.setMinTokenToAdmit(parseEther('1'));
      await dao.setMinDepositAmount(parseEther('1'));
      await memberToken.mint(signer1.address, parseEther('1'));
      await expect(dpAsSigner1.deposit({ value: parseEther('0.99') })).to.be.revertedWith('deposit amount not enough');
    });
    it('can not deposit if not meet minTokenToAdmit amount', async function () {
      await dao.setMinTokenToAdmit(parseEther('1'));
      await dao.setMinDepositAmount(parseEther('1'));
      await memberToken.mint(signer1.address, parseEther('0.99'));
      await expect(dpAsSigner1.deposit({ value: parseEther('1') })).to.be.revertedWith('Admission token not enough');
    });
  });

  describe('depositToken()', function () {
    it('mint 1 dp if deposit 1 TOKEN (price: 0; totalSupply: 0)', async function () {
      await tokenAsSigner1.approve(dp.address, parseEther('1'));
      await dpAsSigner1.depositToken(token.address, parseEther('1'));
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 TOKEN (price: 0.0046; totalSupply: 0.0046)', async function () {
      await tokenAsSigner1.approve(dp.address, parseEther('1'));
      await dpAsSigner1.depositToken(token.address, parseEther('1'));

      await tokenAsSigner2.approve(dp.address, parseEther('1.9'));
      await dpAsSigner2.depositToken(token.address, parseEther('1.9'));
      expect(await dp.balanceOf(signer2.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('1.9'));
    });
  });
  describe('withdraw()', function () {
    it('burn 1 dp and withdraw 1 eth (totalSupply: 1)', async function () {
      await dpAsSigner1.deposit({ value: parseEther('1') });

      expect(await ethers.provider.getBalance(dp.address)).to.eq(parseEther('1'));
      expect((await ethers.provider.getBalance(signer1.address)).lte(parseEther('999'))).to.eq(true);
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(ADDRESS_ETH))).to.eq(parseEther('1'));

      await dpAsSigner1.withdraw(ADDRESS_ETH, parseEther('1'));
      expect(await ethers.provider.getBalance(dp.address)).to.eq(parseEther('0'));
      expect((await ethers.provider.getBalance(signer1.address)).gte(parseEther('999'))).to.eq(true);
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('0'));
    });

    it('burn 0.5 dp and withdraw 1 eth + .5 token (totalSupply: 1)', async function () {
      await tokenAsSigner1.approve(dp.address, parseEther('1'));
      await dpAsSigner1.depositToken(token.address, parseEther('1'));

      expect(await token.balanceOf(dp.address)).to.eq(parseEther('1'));
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('1'));

      await dpAsSigner1.withdraw(token.address, parseEther('0.5'));
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('0.5'));
      expect(await token.balanceOf(dp.address)).to.eq(parseEther('0.5'));
    });
  });
});

describe('DepositPool.sol - one ERC20 asset only', function () {
  let dp, dpAsSigner1, dpAsSigner2;
  let creator;
  let signer1, signer2;
  let token, tokenAsSigner1, tokenAsSigner2;
  let feedRegistry, dao, memberToken;

  beforeEach(async function () {
    [creator, signer1, signer2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory('MockToken', { signer: creator });
    const MockLPDao = await ethers.getContractFactory('MockLPDao', { signer: creator });

    const DepositPool = await ethers.getContractFactory('DepositPool', { signer: creator });

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
    await token.mint(signer1.address, parseEther('100'));
    await token.mint(signer2.address, parseEther('100'));
    await dao.setMemberToken(memberToken.address);

    dp = await upgrades.deployProxy(DepositPool, [dao.address, [token.address], token.address], { kind: 'uups' });

    dpAsSigner1 = dp.connect(signer1);
    dpAsSigner2 = dp.connect(signer2);
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

  describe('name()', function () {
    it('return token name', async function () {
      expect(await dp.name(token.address)).to.eq('TokenA');
    });
  });

  describe('decimals()', function () {
    it('return token name', async function () {
      expect(await dp.decimals(token.address)).to.eq(18);
    });
  });

  describe('uri()', function () {
    it('return token name', async function () {
      const jsonResponse = decodeBase64(await dp.uri(await dpAsSigner1.idOf(token.address)));
      expect(jsonResponse.name).to.equal('TokenA');
    });
  });

  describe('assetBaseCurrencyPrice()', function () {
    it('return 1:1 price', async function () {
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('1'))).to.eq(parseEther('1'));
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('1000'))).to.eq(parseEther('1000'));
      expect(await dp.assetBaseCurrencyPrice(token.address, parseEther('0.0001'))).to.eq(parseEther('0.0001'));
    });
  });

  describe('depositToken()', function () {
    it('mint 1 dp if deposit 1 TOKEN (price: 0; totalSupply: 0)', async function () {
      await tokenAsSigner1.approve(dp.address, parseEther('1'));
      await dpAsSigner1.depositToken(token.address, parseEther('1'));
      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('1'));
    });

    it('mint 1.9 dp for 1.9 TOKEN (price: 1.9; totalSupply: 1.9)', async function () {
      await tokenAsSigner1.approve(dp.address, parseEther('0.1'));
      await dpAsSigner1.depositToken(token.address, parseEther('0.1'));

      await tokenAsSigner2.approve(dp.address, parseEther('1.9'));
      await dpAsSigner2.depositToken(token.address, parseEther('1.9'));
      expect(await dp.balanceOf(signer2.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('1.9'));
    });
  });

  describe('withdraw()', function () {
    it('burn 1 dp and withdraw 1 token (totalSupply: 1)', async function () {
      await tokenAsSigner1.approve(dp.address, parseEther('1'));
      await dpAsSigner1.depositToken(token.address, parseEther('1'));

      expect(await dp.balanceOf(signer1.address, await dpAsSigner1.idOf(token.address))).to.eq(parseEther('1'));

      await dpAsSigner1.withdraw(token.address, parseEther('1'));
      expect(await token.balanceOf(dp.address)).to.eq(parseEther('0'));
      expect(await token.balanceOf(signer1.address)).to.eq(parseEther('100'));
    });
  });
});
