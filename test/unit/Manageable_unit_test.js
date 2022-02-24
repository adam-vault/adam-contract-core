// const { ethers } = require('hardhat');
// const { expect } = require('chai');

// describe('Manageable.sol', () => {
//   let creator, owner, stranger;
//   let Manageable;
//   let contract;

//   beforeEach(async () => {
//     [creator, owner, stranger] = await ethers.getSigners();
//     Manageable = await ethers.getContractFactory('ExposedManageable', creator);
//     contract = await Manageable.deploy();
//   });

//   it('assigns initial owner', async () => {
//     await contract.initOwner(owner.address);

//     expect(await contract.owner()).to.equal(owner.address);
//     expect(await contract.isOwner(owner.address)).to.equal(true);
//     expect(await contract.isManager(owner.address)).to.equal(true);

//     expect(await contract.isOwner(creator.address)).to.equal(false);
//     expect(await contract.isOwner(stranger.address)).to.equal(false);
//     expect(await contract.isManager(creator.address)).to.equal(false);
//     expect(await contract.isManager(stranger.address)).to.equal(false);
//   });

//   it('blocks initial owner when owner initialized', async () => {
//     await contract.initOwner(owner.address);
//     await expect(contract.initOwner(stranger.address)).to.be.revertedWith('owner is initialized');
//   });
// });
