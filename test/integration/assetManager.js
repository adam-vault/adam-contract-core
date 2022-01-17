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

    strategyFactory = await AssetManagerFactory.deploy();
    assetManagerFactory = await StrategyFactory.deploy();
    adam = await Adam.deploy(assetManagerFactory.address, strategyFactory.address);
  });

  it('has no assetManagers when deploy', async function () {
    expect(await adam.countAssetManagers()).to.equal(0);
  });

  it('can create assetManager', async function () {
    await adam.createAssetManager('AM Ltd');
    expect(await adam.countAssetManagers()).to.equal(1);
  });

  it('can create strategy', async function () {
    await adam.createAssetManager('AM Ltd');
    const addr = await adam.assetManagers(0);

    // const assetManager = await ethers.getContractAt('AssetManager', addr);

    await adam.createStrategy(addr, 'AM Ltd', false);
    expect(await adam.countPublicStrategies()).to.equal(1);
  });

  it('create Portfolio when deposit()', async function () {


    // const assetManager = await AssetManager.deploy();
    // await assetManager.deployed();

    // const strategyAddress = await assetManager.strategyList(0);
    // console.log(strategyAddress);
    // const strategy = await Strategy.attach(strategyAddress);
    // // const strategy = await ethers.getContractAt('Strategy', strategyAddress);
    // expect(strategy).to.not.be.empty;

    // const depositTx = await strategy.deposit({ value: ethers.utils.parseEther('1.0') });
    // await depositTx.wait();

    // const portfolioAddress = await strategy.portfolioList(0);
    // console.log(portfolioAddress);
    // expect(portfolioAddress).to.not.be.empty;

    // const tokenId = await strategy.getLastTokenId();
    // const uri = await strategy.tokenURI(tokenId);
    // console.log(uri);

  });
});
