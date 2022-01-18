const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Create AssetManager', function () {
  let creator;
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
    [creator] = await ethers.getSigners();
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

  it('create Portfolio when deposit()', async function () {
    const tx1 = await adam.createAssetManager('AM Ltd');
    await tx1.wait();

    const amAddr = await adam.assetManagers(0);
    const tx2 = await adam.createStrategy(amAddr, 'AM Ltd', false);
    await tx2.wait();
    const sAddr = await adam.publicStrategies(0);

    const strategy = await ethers.getContractAt('Strategy', sAddr);
    await strategy.deposit({ value: ethers.utils.parseEther('0.000123') });

    expect(await strategy.balanceOf(creator.address)).to.equal(1);
    expect(await strategy.countPortfolio()).to.equal(1);

    const base64String = (await strategy.tokenURI(1)).split(',')[1];
    const uriResponse = Buffer.from(base64String, 'base64');
    const jsonResponse = JSON.parse(uriResponse);

    expect(jsonResponse.name).to.equal('Adam Portfolio #1');
    expect(jsonResponse.attributes[0].value).to.not.be.empty;
  });
});
