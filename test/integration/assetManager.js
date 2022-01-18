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

  it('can create assetManager', async function () {
    await expect(adam.createAssetManager(toBytes32('AM Ltd')))
      .to.emit(adam, 'CreateAssetManager');
    expect(await adam.countAssetManagers()).to.equal(1);
  });

  it('can create public strategy', async function () {
    await adam.createAssetManager(toBytes32('AM Ltd'));
    const amAddr = await adam.assetManagers(0);
    await expect(adam.createStrategy(amAddr, web3StringToBytes32('AM Ltd'), false))
      .to.emit(adam, 'CreateStrategy');
    expect(await adam.countPublicStrategies()).to.equal(1);
  });

  it('can create private strategy', async function () {
    await adam.createAssetManager(toBytes32('AM Ltd'));
    const amAddr = await adam.assetManagers(0);
    await expect(adam.createStrategy(amAddr, toBytes32('AM Ltd'), true))
      .to.emit(adam, 'CreateStrategy');
    expect(await adam.countPublicStrategies()).to.equal(0);
    expect(await adam.countStrategies()).to.equal(1);
  });

  it('create Portfolio when deposit()', async function () {
    const tx1 = await adam.createAssetManager(toBytes32('AM Ltd'));
    await tx1.wait();

    const amAddr = await adam.assetManagers(0);
    const tx2 = await adam.createStrategy(amAddr, toBytes32('AM Ltd'), false);
    await tx2.wait();
    const sAddr = await adam.publicStrategies(0);

    console.log(sAddr);

    const Strategy = await ethers.getContractFactory('Strategy');
    const strategy = await Strategy.attach(sAddr);
    await strategy.deposit();
  });
});
