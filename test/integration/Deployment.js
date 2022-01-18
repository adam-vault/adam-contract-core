const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Deployment', function () {
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

  describe('when initialize adam', function () {
    it('has assetManagerFactory', async function () {
      expect(await adam.assetManagerFactory()).to.not.be.empty;
    });
    it('has strategyFactory', async function () {
      expect(await adam.strategyFactory()).to.not.be.empty;
    });
    it('has no AssetManagers when deploy', async function () {
      expect(await adam.countAssetManagers()).to.equal(0);
    });
    it('has no Strategies when deploy', async function () {
      expect(await adam.countStrategies()).to.equal(0);
    });
    it('has no public Strategies when deploy', async function () {
      expect(await adam.countPublicStrategies()).to.equal(0);
    });
  });
  describe('when adam uses assetManagerFactory', async function () {
    it('set adam address', async function () {
      expect(await assetManagerFactory.adam()).to.equal(adam.address);
    });
    it('cannot set adam address twice', async function () {
      await expect(assetManagerFactory.setAdam(ethers.constants.AddressZero)).to.be.revertedWith('Adam is set');
    });
    it('set adam address', async function () {
      expect(await strategyFactory.adam()).to.equal(adam.address);
    });
    it('cannot set adam address twice', async function () {
      await expect(strategyFactory.setAdam(ethers.constants.AddressZero)).to.be.revertedWith('Adam is set');
    });
  });
});
