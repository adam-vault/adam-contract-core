const chai = require('chai');
const hre = require('hardhat');
const { smock } = require('@defi-wonderland/smock');

const { ethers } = hre;
const { expect } = chai;
const { createAdam } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');

chai.use(smock.matchers);

describe('Integration - Adam.sol - test/integration/Adam.js', async () => {
    let creator;
    let adam;
    let ethereumChainlinkPriceGateway;
    let Dao;

    before(async () => {
        Dao = await ethers.getContractFactory('Dao');
    });

    beforeEach(async () => {
        [creator] = await ethers.getSigners();
        const result = await createAdam();
        adam = result.adam;
        ethereumChainlinkPriceGateway = result.ethPriceGateway;
    });

    describe('when createDao() called', async () => {
        it('creates successfully', async () => {
            await expect(
                adam.createDao(
                    ...paramsStruct.getCreateDaoParams({
                        name: 'A Company',
                        depositTokens: [],
                        priceGateways: [ethereumChainlinkPriceGateway.address],
                    }),
                ),
            ).to.emit(adam, 'CreateDao');
        });

        it('creates successfully when set 0x0 as admission token', async () => {
            await expect(
                adam.createDao(
                    ...paramsStruct.getCreateDaoParams({
                        mintMemberToken: true,
                        admissionTokens: [
                            [ethers.constants.AddressZero, 50, 0, true],
                        ],
                        priceGateways: [ethereumChainlinkPriceGateway.address],
                    }),
                ),
            ).to.not.be.reverted;
        });

        it('throws "" error when set non-contract address as admission token', async () => {
            await expect(
                adam.createDao(
                    ...paramsStruct.getCreateDaoParams({
                        mintMemberToken: true,
                        admissionTokens: [[creator.address, 50, 0, false]],
                        priceGateways: [ethereumChainlinkPriceGateway.address],
                    }),
                ),
            ).to.be.revertedWithCustomError(Dao, 'ContractCallFail');
        });
    });
});
