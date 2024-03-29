const chai = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { expect } = chai;
chai.should();
chai.use(smock.matchers);

describe('MemberToken.sol - test/unit/MemberToken.js', async function () {
  let member, minter;
  let memberToken, MemberToken;
  let DaoChildBeaconProxy, daoProxy, impl;

  before(async function () {
    [minter, member] = await ethers.getSigners();
    MemberToken = await ethers.getContractFactory('MemberToken');
    DaoChildBeaconProxy = await ethers.getContractFactory('DaoChildBeaconProxy');
  });

  beforeEach(async function () {
    const daoBeacon = await smock.fake('DaoBeacon');
    daoProxy = await smock.fake('DaoBeaconProxy');
    impl = await MemberToken.deploy();

    daoBeacon.implementation.returns(impl.address);
    daoProxy.daoBeacon.returns(daoBeacon.address);

    memberToken = await (DaoChildBeaconProxy).deploy(
      daoProxy.address,
      ethers.utils.id('adam.dao.member_token'),
      impl.interface.encodeFunctionData('initialize', ['MemberTokenName', 'MT']),
    );

    memberToken = await ethers.getContractAt('MemberToken', memberToken.address);
  });

  describe('initialize()', async function () {
    it('init with minter, name and symbol', async function () {
      let contract = await DaoChildBeaconProxy.deploy(
        daoProxy.address,
        ethers.utils.id('adam.dao.member_token'),
        impl.interface.encodeFunctionData('initialize', [
          'MemberTokenName', 'MT',
        ]),
      );
      contract = await ethers.getContractAt('MemberToken', contract.address);

      expect(await contract.owner()).to.equal(minter.address);
      expect(await contract.name()).to.equal('MemberTokenName');
      expect(await contract.symbol()).to.equal('MT');
    });
  });

  describe('mint()', async function () {
    it('mints when msg.sender is minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      expect(await memberToken.balanceOf(member.address)).to.equal(10);
    });

    it('throws "Ownable: caller is not the owner" error if not called by minter', async function () {
      await expect(memberToken.connect(member).mint(member.address, 10)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('getVotes()', async function () {
    it('returns correct votes of non minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      expect(await memberToken.getVotes(member.address)).to.equal(10);
    });

    it('returns 0 of minter', async function () {
      await memberToken.connect(minter).mint(minter.address, 10);
      expect(await memberToken.getVotes(minter.address)).to.equal(0);
    });
  });

  describe('getPastVotes()', async function () {
    it('returns correct votes of non minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.connect(minter).mint(member.address, 10);

      expect(await memberToken.getPastVotes(member.address, blockNumber)).to.equal(10);
    });

    it('returns 0 of minter', async function () {
      await memberToken.connect(minter).mint(minter.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.connect(minter).mint(minter.address, 10);

      expect(await memberToken.getPastVotes(minter.address, blockNumber)).to.equal(0);
    });
  });

  describe('getPastTotalSupply', async function () {
    it('returns total amount without balance of minter', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      await memberToken.connect(minter).mint(minter.address, 10);
      const blockNumber = await ethers.provider.getBlockNumber();
      await memberToken.connect(minter).mint(member.address, 10);

      expect(await memberToken.getPastTotalSupply(blockNumber)).to.equal(10);
    });
  });

  describe('delegate', async function () {
    it('delegate fail for Member Token', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      await expect(
        memberToken
          .connect(member)
          .delegate(minter.address))
        .to.be.revertedWith('Not support delegate Vote');
    });
  });
  describe('delegateBySig', async function () {
    it('delegateBySig fail for Member Token', async function () {
      await memberToken.connect(minter).mint(member.address, 10);
      await expect(
        memberToken
          .connect(member)
          .delegateBySig(minter.address, 0, 0, 0, ethers.utils.formatBytes32String(''), ethers.utils.formatBytes32String('')))
        .to.be.revertedWith('Not support delegate Vote');
    });
  });
});
