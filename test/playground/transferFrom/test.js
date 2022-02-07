const { ethers } = require('hardhat');
const chai = require('chai');
const { iteratee } = require('lodash');
const { expect } = chai;

describe('test transferFrom', function () {
    let creator;
    let a,b;

    before(async function() {
        [creator] = await ethers.getSigners();
        const A = await ethers.getContractFactory('TokenA');
        a = await A.deploy();
        await a.deployed();

        const B = await ethers.getContractFactory('TokenB');
        b = await B.deploy();
        await b.deployed();
    });

    describe('transfer after approve', function () {
        it('should success', async function() {

            await b.approve(a.address, 100000000);
            await a.receiveToken(b.address, creator.address);

            console.log("===Creator balance of B====", await b.balanceOf(creator.address));
            console.log("===Token A balance of B====", await b.balanceOf(a.address));
        });
    });

});
