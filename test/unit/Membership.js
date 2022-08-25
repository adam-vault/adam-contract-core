const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('Membership.sol', function () {
  let creator, signer, msAsSigner;
  let membership;

  beforeEach(async function () {
    [creator, signer] = await ethers.getSigners();
    const Membership = await ethers.getContractFactory('Membership', { signer: creator });
    membership = await upgrades.deployProxy(Membership, [signer.address, 'testMemberShip', 10], { kind: 'uups' });
    msAsSigner = membership.connect(signer);
  });

  describe('createMember()', function () {
    it('creates member success', async function () {
      await msAsSigner.createMember(signer.address);
      expect(await msAsSigner.isMember(signer.address)).to.eq(true);
    });

    it('creates same member fail', async function () {
      await msAsSigner.createMember(signer.address);
      expect(await msAsSigner.isMember(signer.address)).to.eq(true);
      await expect(msAsSigner.createMember(signer.address)).to.be.revertedWith('Member already created');
    });
  });
});
