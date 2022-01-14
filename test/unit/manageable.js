const { waffle, ethers } = require('hardhat');
const { expect } = require('chai');
const Manageable = require('../../build/Manageable.json');
const { deployContract } = waffle;

describe('Manageable', () => {
    let wallet, stranger;
    let contract;

    beforeEach(async () => {
        [wallet, stranger] = await ethers.getSigners();
        contract = await deployContract(wallet, Manageable, []);
    });

    it('assigns initial owner', async () => {
        expect(await contract.owner()).to.equal(wallet.address);
        expect(await contract.isOwner(wallet.address)).to.equal(true);
        expect(await contract.isManager(wallet.address)).to.equal(true);
        expect(await contract.isManager(stranger.address)).to.equal(false);
    });
});