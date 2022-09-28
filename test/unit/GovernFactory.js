const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const findEventArgs = require('../../utils/findEventArgs');

describe('GovernFactory.sol - test/unit/GovernFactory.js', function () {
  let creator, unknown;
  let governFactory, govern;
  let GovernFactory;

  beforeEach(async function () {
    [creator, unknown] = await ethers.getSigners();

    const Govern = await ethers.getContractFactory('MockGovern');
    govern = await Govern.deploy();
    await govern.deployed();

    GovernFactory = await ethers.getContractFactory('GovernFactory');
    governFactory = await upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups' });
  });

  describe('initialize()', function () {
    it('init with _governImplementation', async function () {
      const contract = await upgrades.deployProxy(GovernFactory, [govern.address], { kind: 'uups', signer: creator });
      expect(await contract.governImplementation()).to.equal(govern.address);
    });
    it('throws "Govern implementation must not be null" error if Address zero pass as impl', async function () {
      await expect(upgrades.deployProxy(GovernFactory, [ethers.constants.AddressZero], { kind: 'uups', signer: creator })).to.revertedWith('Govern implementation must not be null');
    });
  });

  describe('upgradeTo()', function () {
    let mockV2Impl;
    beforeEach(async function () {
      const MockUpgrade = await ethers.getContractFactory('MockVersionUpgrade');
      mockV2Impl = await MockUpgrade.deploy();
      await mockV2Impl.deployed();
    });
    it('allows owner to upgrade', async function () {
      await governFactory.connect(creator).upgradeTo(mockV2Impl.address);
      const v2Contract = await ethers.getContractAt('MockVersionUpgrade', governFactory.address);
      expect(await v2Contract.v2()).to.equal(true);
    });
    it('throws "Ownable: caller is not the owner" error if upgrade by non dao', async function () {
      await expect(governFactory.connect(unknown).upgradeTo(mockV2Impl.address)).to.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('setGovernImplementation()', function () {
    let newGovernImpl;
    beforeEach(async function () {
      const Govern = await ethers.getContractFactory('Govern');
      newGovernImpl = await Govern.deploy();
    });
    it('allows owner to setGovernImplementation', async function () {
      await governFactory.connect(creator).setGovernImplementation(newGovernImpl.address);
      expect(await governFactory.governImplementation()).to.eq(newGovernImpl.address);
    });
    it('throws "governImpl is null" error if govern set with 0x Address', async function () {
      await expect(governFactory.connect(creator).setGovernImplementation(ethers.constants.AddressZero)).to.revertedWith('governImpl is null');
    });
    it('throws "Ownable: caller is not the owner" error if upgrade by non dao', async function () {
      await expect(governFactory.connect(unknown).setGovernImplementation(newGovernImpl.address)).to.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('createGovern()', function () {
    it('creates a new govern', async function () {
      const tx = await governFactory.createGovern('mockName', 0, 0, 0, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');
      const { govern: governAddress } = await findEventArgs(tx, 'CreateGovern');
      expect(await governFactory.governMap(creator.address, 'mockName')).to.equal(governAddress);
    });

    it('throws "error" error if name is duplicated', async function () {
      await governFactory.createGovern('mockName', 0, 0, 0, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');
      await expect(governFactory.createGovern('mockName', 0, 0, 0, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')).to.be.revertedWith('error');
    });
  });
});
