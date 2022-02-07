const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createAdam } = require('../utils/createContract');

describe('Deployment', function () {
  let creator;
  let adam, strategyFactory, assetManagerFactory;

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    const result = await createAdam();
    adam = result.adam;
    strategyFactory = result.strategyFactory;
    assetManagerFactory = result.assetManagerFactory;
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
