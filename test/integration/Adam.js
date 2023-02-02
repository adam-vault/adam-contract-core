const chai = require('chai');
const hre = require('hardhat');
const { smock } = require('@defi-wonderland/smock');
const { ethers } = hre;
const { expect } = chai;
const { createAdam } = require('../utils/createContract');
const paramsStruct = require('../../utils/paramsStruct');
chai.use(smock.matchers);

describe('Integration - Adam.sol - test/integration/Adam.js', async function () {
  let creator;
  let adam, ethereumChainlinkPriceGateway;
  let Dao;

  before(async function () {
    Dao = await ethers.getContractFactory('Dao');
  });

  beforeEach(async function () {
    [creator] = await ethers.getSigners();
    const result = await createAdam();
    adam = result.adam;
    ethereumChainlinkPriceGateway = result.ethPriceGateway;
  });

  describe('when createDao() called', async function () {
    it('creates successfully', async function () {
      await expect(adam.createDao(...paramsStruct.getCreateDaoParams({
        name: 'A Company',
        depositTokens: [],
        priceGateways: [ethereumChainlinkPriceGateway.address],
      })))
        .to.emit(adam, 'CreateDao');
    });

    it('creates successfully when set 0x0 as admission token', async function () {
      await expect(adam.createDao(
        ...paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[ethers.constants.AddressZero, 50, 0, true]],
          priceGateways: [ethereumChainlinkPriceGateway.address],
        }),
      )).to.not.be.reverted;
    });

    it('throws "" error when set non-contract address as admission token', async function () {
      await expect(adam.createDao(
        ...paramsStruct.getCreateDaoParams({
          mintMemberToken: true,
          admissionTokens: [[creator.address, 50, 0, false]],
        }),
      )).to.be.revertedWithCustomError(Dao, 'ContractCallFail');
    });
  });
});
