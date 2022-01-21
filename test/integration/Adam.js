const chai = require('chai');
const { ethers } = require('hardhat');
const _ = require('lodash');
const { smock } = require('@defi-wonderland/smock');
const { expect } = chai;
chai.use(smock.matchers);

describe('Create AssetManager', function () {
  let creator, owner1, owner2, owner3;
  let adam, strategyFactory, assetManagerFactory;
  let libraries;

  before(async function () {
    const [libCreator] = await ethers.getSigners();
    const ToString = await ethers.getContractFactory('ToString', libCreator);
    const toString = await ToString.deploy();
    await toString.deployed();

    libraries = {
      ToString: toString.address,
    };
  });

  beforeEach(async function () {
    [creator, owner1, owner2, owner3] = await ethers.getSigners();
    const AssetManagerFactory = await ethers.getContractFactory('AssetManagerFactory', { signer: creator, libraries });
    const StrategyFactory = await ethers.getContractFactory('StrategyFactory', { signer: creator, libraries });
    const Adam = await ethers.getContractFactory('Adam', { signer: creator });

    assetManagerFactory = await AssetManagerFactory.deploy();
    strategyFactory = await StrategyFactory.deploy();

    await strategyFactory.deployed();
    await assetManagerFactory.deployed();

    adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
    await adam.deployed();
  });

  it('can create assetManager', async function () {
    await expect(adam.createAssetManager('AM Ltd'))
      .to.emit(adam, 'CreateAssetManager');

    const amAddr = await adam.assetManagers(0);
    const assetManager = await ethers.getContractAt('AssetManager', amAddr);

    expect(await assetManager.adam()).to.equal(adam.address);
    expect(await adam.countAssetManagers()).to.equal(1);
  });

  it('can create public strategy', async function () {
    await adam.createAssetManager('AM Ltd');
    const amAddr = await adam.assetManagers(0);
    const assetManager = await ethers.getContractAt('AssetManager', amAddr);
    await expect(adam.createStrategy(amAddr, 'AM Ltd', false))
      .to.emit(adam, 'CreateStrategy');
    expect(await assetManager.countStrategy()).to.equal(1);
    expect(await adam.countPublicStrategies()).to.equal(1);
  });

  it('can create private strategy', async function () {
    await adam.createAssetManager('AM Ltd');
    const amAddr = await adam.assetManagers(0);
    await expect(adam.createStrategy(amAddr, 'AM Ltd', true))
      .to.emit(adam, 'CreateStrategy');
    expect(await adam.countPublicStrategies()).to.equal(0);
    expect(await adam.countStrategies()).to.equal(1);
  });
  describe('Create AssetManager', function () {
    let strategy, amAddr, assetManager;
    beforeEach(async function () {
      const tx1 = await adam.createAssetManager('AM Ltd');
      const receipt = await tx1.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateAssetManager' });
      amAddr = creationEventLog.args.assetManager;
      assetManager = await ethers.getContractAt('AssetManager', amAddr);
      const tx2 = await adam.createStrategy(amAddr, 'AM Ltd', false);
      await tx2.wait();
      const sAddr = await adam.publicStrategies(0);

      strategy = await ethers.getContractAt('Strategy', sAddr);
    });

    it('create Portfolio when deposit()', async function () {
      await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });

      expect(await strategy.balanceOf(creator.address)).to.equal(1);
      expect(await strategy.countPortfolio()).to.equal(1);

      const base64String = (await strategy.tokenURI(1)).split(',')[1];
      const uriResponse = Buffer.from(base64String, 'base64');
      const jsonResponse = JSON.parse(uriResponse);

      expect(jsonResponse.name).to.equal('Adam Portfolio #1');
      expect(jsonResponse.attributes[0].value).to.not.be.empty;
      expect(await ethers.provider.getBalance(amAddr)).to.equal(ethers.utils.parseEther('0.000123'));
    });

    it('gives token uri with portfolio address', async function () {
      const tx = await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });
      const receipt = await tx.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreatePortfolio' });
      const portfolioAddr = creationEventLog.args.portfolio;

      const base64String = (await strategy.tokenURI(1)).split(',')[1];
      const uriResponse = Buffer.from(base64String, 'base64');
      const jsonResponse = JSON.parse(uriResponse);

      expect(jsonResponse.name).to.equal('Adam Portfolio #1');
      expect(jsonResponse.attributes[0].value.toLowerCase()).to.equal(portfolioAddr.toLowerCase());
    });

    it('should not recreate Portfolio when deposit() again by same EOA', async function () {
      await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });
      await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });
      await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });

      expect(await strategy.balanceOf(creator.address)).to.equal(1);
      expect(await strategy.countPortfolio()).to.equal(1);
      expect(await ethers.provider.getBalance(amAddr)).to.equal(ethers.utils.parseEther('0.000369'));
    });
  });

  describe('Interact with WETH', function () {
    let strategy, amAddr, assetManager, mockWETH9;
    beforeEach(async function () {
      const MockWETH9 = await ethers.getContractFactory('MockWETH9', creator);
      mockWETH9 = await MockWETH9.deploy();
      await mockWETH9.deployed();

      const tx1 = await adam.createAssetManager('AM Ltd');
      const receipt = await tx1.wait();
      const creationEventLog = _.find(receipt.events, { event: 'CreateAssetManager' });
      amAddr = creationEventLog.args.assetManager;
      assetManager = await ethers.getContractAt('AssetManager', amAddr);
      const tx2 = await adam.createStrategy(amAddr, 'AM Ltd', false);
      await tx2.wait();
      const sAddr = await adam.publicStrategies(0);
      strategy = await ethers.getContractAt('Strategy', sAddr);
    });

    it('create Portfolio when deposit()', async function () {
      const [p1, p2, p3] = await Promise.all([owner1, owner2, owner3].map(async (owner) => {
        const tx = await strategy.connect(owner).deposit({ value: ethers.utils.parseEther('0.000123') });
        const receipt = await tx.wait();
        const creationEventLog = _.find(receipt.events, { event: 'CreatePortfolio' });
        return creationEventLog.args.portfolio;
      }));

      await assetManager.depositAnyContract(ethers.constants.AddressZero, mockWETH9.address,
        [p1, p2, p3],
        [
          ethers.utils.parseEther('0.000123'),
          ethers.utils.parseEther('0.0001'),
          ethers.utils.parseEther('0.0001'),
        ]);
      expect(await assetManager.balanceOf(p1, 1)).to.equal(ethers.utils.parseEther('0'));
      expect(await assetManager.balanceOf(p1, 2)).to.equal(ethers.utils.parseEther('0.000123'));
      expect(await assetManager.balanceOf(p2, 1)).to.equal(ethers.utils.parseEther('0.000023'));
      expect(await assetManager.balanceOf(p2, 2)).to.equal(ethers.utils.parseEther('0.000100'));
      expect(await assetManager.balanceOf(p3, 1)).to.equal(ethers.utils.parseEther('0.000023'));
      expect(await assetManager.balanceOf(p3, 2)).to.equal(ethers.utils.parseEther('0.000100'));

      expect(await mockWETH9.balanceOf(assetManager.address)).to.equal(ethers.utils.parseEther('0.000323'));
    });
  });
});
