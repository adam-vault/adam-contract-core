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

  describe('addTeam()', function () {
    it('should add a team', async function () {
      const teamName = 'Testing01';

      expect(await team.addTeam(teamName, member1.address, [member1.address, member2.address], 'Hello')).to.emit('AddTeam');
      expect(await team.creatorList(1)).to.eq(creator.address);
      expect(await team.teamMinters(1)).to.eq(member1.address);
      expect(await team.teamList(1)).to.eq(teamName);

      await team.addTeam(teamName, member1.address, [member1.address, member2.address], 'Hello');
      expect(await team.teamList(2)).to.eq(teamName);
    });
  });

  describe('uri()', function () {
    it('should return a correct uri', async function () {
      await team.addTeam('TTT', member1.address, [member1.address, member2.address], 'Hello');
      const uri = await team.uri(1);
      const res = decodeBase64(uri);

      expect(res.name).to.eq('TTT');
      expect(res.creator).to.eq(creator.address.toLowerCase());
      expect(res.minter).to.eq(member1.address.toLowerCase());
    });
  });

  describe('addMembers()', function () {
    it('should be able to add members', async function () {
      expect(await team.balanceOf(member3.address, 1)).to.eq(0);

      await team.addTeam('TTT', member1.address, [member1.address, member2.address], 'Hello');

      await team.connect(member1).addMembers([member3.address], 1);
      expect(await team.balanceOf(member3.address, 1)).to.eq(1);
    });

    it('could only be execute by minter', async function () {
      await team.addTeam('TTT', member1.address, [member1.address, member2.address], 'Hello');

      await expect(team.connect(member2).addMembers([member3.address], 1)).to.revertedWith('Team: only selected minter');
    });
  });

  describe('removeMembers()', function () {
    it('should be able to remove members', async function () {
      await team.addTeam('TTT', member1.address, [member1.address, member2.address], 'Hello');

      await team.connect(member1).removeMembers([member1.address], 1);
      expect(await team.balanceOf(member1.address, 1)).to.eq(0);
    });

    it('could only be execute by minter', async function () {
      await team.addTeam('TTT', member1.address, [member1.address, member2.address], 'Hello');

      await expect(team.connect(member2).removeMembers([member3.address], 1)).to.revertedWith('Team: only selected minter');
    });
  });
});
