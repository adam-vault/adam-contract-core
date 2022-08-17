const { expect } = require('chai');
const { ethers } = require('hardhat');
const decodeBase64 = require('../utils/decodeBase64');

describe('Team.sol', function () {
  let creator, member1, member2, member3;
  let team;

  beforeEach(async function () {
    [creator, member1, member2, member3] = await ethers.getSigners();
    const Team = await ethers.getContractFactory('Team', { signer: creator });
    team = await Team.deploy();
  });

  describe('safeTransferFrom()', function () {
    let teamId, tx;
    beforeEach(async function () {
      tx = await team.addTeam('Team Name', member1.address, [member1.address, member2.address], 'Description');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransferSingle');
      teamId = event.args.id;
    });
    it('throw "Team: Transfer of team ownership is aboundand" error if member transfer their token', async function () {
      await expect(team.connect(member2).safeTransferFrom(member2.address, member3.address, teamId, 1, '0x')).to.revertedWith('Team: Transfer of team ownership is aboundand');
    });
  });

  describe('addTeam()', function () {
    let teamId, tx;
    beforeEach(async function () {
      tx = await team.addTeam('Team Name', member1.address, [member1.address, member2.address], 'Description');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransferSingle');
      teamId = event.args.id;
    });
    it('adds a team', async function () {
      expect(tx).to.emit('AddTeam');
      expect(await team.creatorOf(teamId)).to.eq(creator.address);
      expect(await team.minterOf(teamId)).to.eq(member1.address);
      expect(await team.nameOf(teamId)).to.eq('Team Name');
    });
    it('mints tokens to member', async function () {
      expect(tx).to.emit('AddTeam');
      expect(await team.balanceOf(member1.address, teamId)).to.eq(1);
      expect(await team.balanceOf(member2.address, teamId)).to.eq(1);
    });
  });

  describe('uri()', function () {
    let teamId;
    beforeEach(async function () {
      const tx = await team.addTeam('Team Name', member1.address, [member1.address, member2.address], 'Description');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransferSingle');
      teamId = event.args.id;
    });
    it('returns uri with name, creator, minter', async function () {
      const uri = await team.uri(teamId);
      const res = decodeBase64(uri);

      expect(res.name).to.eq('Team Name');
      expect(res.creator).to.eq(creator.address.toLowerCase());
      expect(res.minter).to.eq(member1.address.toLowerCase());
    });
  });

  describe('addMembers()', function () {
    let teamId;
    beforeEach(async function () {
      const tx = await team.addTeam('Team Name', member1.address, [member1.address, member2.address], 'Description');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransferSingle');
      teamId = event.args.id;
    });
    it('mints token to members', async function () {
      await team.connect(member1).addMembers([member3.address], teamId);
      expect(await team.balanceOf(member3.address, teamId)).to.eq(1);
    });
    it('will not mint twice to member', async function () {
      await expect(team.connect(member1).addMembers([member1.address], teamId)).to.revertedWith('Team: Member/Members already added');
    });
    it('throw "Team: only selected minter" error if not minter', async function () {
      await expect(team.connect(member2).addMembers([member3.address], teamId)).to.revertedWith('Team: only selected minter');
    });
  });

  describe('removeMembers()', function () {
    let teamId;
    beforeEach(async function () {
      const tx = await team.addTeam('Team Name', member1.address, [member1.address, member2.address], 'Description');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransferSingle');
      teamId = event.args.id;
    });
    it('removes members', async function () {
      await team.connect(member1).removeMembers([member1.address], teamId);
      expect(await team.balanceOf(member1.address, teamId)).to.eq(0);
    });

    it('throw "Team: only selected minter" error if not minter', async function () {
      await expect(team.connect(member2).removeMembers([member3.address], teamId)).to.revertedWith('Team: only selected minter');
    });
  });

  describe('setInfo()', function () {
    let teamId;
    beforeEach(async function () {
      const tx = await team.addTeam('Team Name', member1.address, [member1.address, member2.address], 'Description');
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'TransferSingle');
      teamId = event.args.id;
    });
    it('updates name, description', async function () {
      await team.connect(member1).setInfo('newName', 'newDescription', teamId);
      expect(await team.nameOf(teamId)).to.eq('newName');
      expect(await team.descriptionOf(teamId)).to.eq('newDescription');
    });
  });
});
