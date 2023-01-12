const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const decodeBase64 = require('../utils/decodeBase64');
const findEventArgs = require('../../utils/findEventArgs');

describe('Team.sol - test/unit/Team.js', function () {
  let creator, member1, member2, member3;
  let team;
  let teamId;

  beforeEach(async function () {
    [creator, member1, member2, member3] = await ethers.getSigners();

    // contract
    team = await (await smock.mock('Team')).deploy();
    await team.setVariable('_owner', creator.address);

    const tx = await team.addTeam(
      'Team Name',
      member1.address,
      [member1.address, member2.address],
      'Description');
    teamId = await findEventArgs(tx, 'TransferSingle', 'id');
  });

  it('init creator as owner', async function () {
    expect(await team.owner()).to.eq(creator.address);
  });

  describe('safeTransferFrom()', function () {
    it('throws "Team: Transfer of team ownership is aboundand" error if member transfer their token', async function () {
      await expect(
        team
          .connect(member2)
          .safeTransferFrom(
            member2.address, // from
            member3.address, // to
            teamId, // tokenId
            1, // amount
            '0x'),
      ).to.revertedWith('Team: Transfer of team ownership is aboundand');
    });
  });

  describe('addTeam()', function () {
    it('adds a team', async function () {
      const tx = await team.addTeam(
        'Team Name',
        member1.address,
        [member1.address, member2.address],
        'Description');
      teamId = await findEventArgs(tx, 'TransferSingle', 'id');

      expect(await team.minterOf(teamId)).to.eq(member1.address);
      expect(await team.nameOf(teamId)).to.eq('Team Name');
    });
    it('mints tokens to member', async function () {
      expect(await team.balanceOf(member1.address, teamId)).to.eq(1);
      expect(await team.balanceOf(member2.address, teamId)).to.eq(1);
    });
    it('throws "minter is null" error if null is set', async function () {
      await expect(
        team.addTeam(
          'Team Name',
          ethers.constants.AddressZero,
          [member1.address, member2.address],
          'Description'),
      ).to.revertedWith('minter is null');
    });
  });

  describe('uri()', function () {
    it('returns uri with name, creator, minter', async function () {
      const res = decodeBase64(await team.uri(teamId));

      expect(res.name).to.eq('Team Name');
      expect(res.creator).to.eq(creator.address.toLowerCase());
      expect(res.minter).to.eq(member1.address.toLowerCase());
    });
  });

  describe('addMembers()', function () {
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
    it('throw "Team: only selected minter" error if team not exists', async function () {
      await expect(team.connect(member2).addMembers([member3.address], 0)).to.revertedWith('Team: only selected minter');
    });
  });

  describe('removeMembers()', function () {
    it('removes members', async function () {
      await team.connect(member1).removeMembers([member1.address], teamId);
      expect(await team.balanceOf(member1.address, teamId)).to.eq(0);
    });
    it('throw "Team: only selected minter" error if removes non-member', async function () {
      await expect(team.connect(member1).removeMembers([member3.address], teamId)).to.revertedWith('Team: Member/Members not exists');
    });
    it('throw "Team: only selected minter" error if not minter', async function () {
      await expect(team.connect(member2).removeMembers([member1.address], teamId)).to.revertedWith('Team: only selected minter');
    });
    it('throw "Team: only selected minter" error if team not exists', async function () {
      await expect(team.connect(member2).removeMembers([member3.address], 0)).to.revertedWith('Team: only selected minter');
    });
  });

  describe('setInfo()', function () {
    it('updates name, description', async function () {
      await team.connect(member1).setInfo('newName', 'newDescription', teamId);
      expect(await team.nameOf(teamId)).to.eq('newName');
      expect(await team.descriptionOf(teamId)).to.eq('newDescription');
    });
    it('throw "Team: only selected minter" error if not minter', async function () {
      await expect(team.connect(member2).setInfo('newName', 'newDescription', teamId)).to.revertedWith('Team: only selected minter');
    });
    it('throw "Team: only selected minter" error if team not exists', async function () {
      await expect(team.connect(member2).setInfo('newName', 'newDescription', 0)).to.revertedWith('Team: only selected minter');
    });
  });
});
