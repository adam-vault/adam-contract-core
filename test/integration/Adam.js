const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Adam', function () {
  let creator;
  let adam, strategyFactory, assetManagerFactory;

  let libraries;

  before(async function () {
    const [libCreator] = await ethers.getSigners();
    const ToString = await ethers.getContractFactory('ToString', libCreator);
    // const Base64 = await ethers.getContractFactory('Base64', libCreator);
    const toString = await ToString.deploy();
    // const base64 = await Base64.deploy();
    await toString.deployed();

    libraries = {
      ToString: toString.address,
      // Base64: base64.address,
    };
  });

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    const AssetManagerFactory = await ethers.getContractFactory('AssetManagerFactory', { signer: creator, libraries });
    const StrategyFactory = await ethers.getContractFactory('StrategyFactory', { signer: creator });
    const Adam = await ethers.getContractFactory('Adam', { signer: creator });

    assetManagerFactory = await AssetManagerFactory.deploy();
    strategyFactory = await StrategyFactory.deploy();

    await strategyFactory.deployed();
    await assetManagerFactory.deployed();

    adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
    await adam.deployed();
  });

  it('has no assetManagers when deploy', async function () {
    expect(await adam.countAssetManagers()).to.equal(0);
  });

  it('run factory setAdam', async function () {
    expect(await assetManagerFactory.adam()).to.equal(adam.address);
    expect(await strategyFactory.adam()).to.equal(adam.address);
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

  it('create Portfolio when deposit()', async function () {
    const tx1 = await adam.createAssetManager('AM Ltd');
    await tx1.wait();

    const amAddr = await adam.assetManagers(0);
    const tx2 = await adam.createStrategy(amAddr, 'AM Ltd', false);
    await tx2.wait();
    const sAddr = await adam.publicStrategies(0);

    const strategy = await ethers.getContractAt('Strategy', sAddr);
    await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });
  });
});
