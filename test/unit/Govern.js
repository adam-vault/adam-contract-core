const { expect } = require("chai");
const { smock } = require('@defi-wonderland/smock');
const { ethers, waffle } = require('hardhat');
const { createGovern, createAdam } = require('../utils/createContract');
const { iteratee } = require("lodash");

describe('Govern', function() {
    let adam, dao, governFactory, govern;
    let creator, owner1, owner2, owner3;
    let tokenA;
    const provider = waffle.provider;

    beforeEach(async function() {
        [creator, owner1, owner2, owner3] = await ethers.getSigners();

        govern = await createAdam();
    });

    describe('Test', function() {
        it('should create a test', async function () {
            console.log("======", govern.address);
        })
    });
});