const { ethers } = require('hardhat');
const chai = require('chai');
const { expect } = chai;

describe('MultiToken.sol', function () {
  let creator;
  let MultiToken;

  before(async function () {
    [creator] = await ethers.getSigners();
    MultiToken = await ethers.getContractFactory('ExposedMultiToken', { signer: creator });
  });

  describe('__constructor(postfix)', function () {
    let contract;

    beforeEach(async function () {
      contract = await MultiToken.deploy('Postfix');
      await contract.deployed();
    });

    it('should init postfix', async () => {
      expect(await contract.postfix()).to.equal('Postfix');
    });

    it('should register token ETH (Adam) as 0x0 address', async () => {
      expect(await contract.addressToId(ethers.constants.AddressZero)).to.equal(1);
      expect(await contract.name(1)).to.equal('ETH');
    });
  });

  describe('createToken(contractAddress,name,decimals)', function () {
    let contract, id, address;

    beforeEach(async function () {
      address = '0x95b58a6bff3d14b7db2f5cb5f0ad413dc2940658'.toLowerCase();
      contract = await MultiToken.deploy('Postfix');
      await contract.deployed();
      await contract.createToken(address, 'DAI', 18);
      id = await contract.addressToId(address);
    });

    it('generates new id', async () => {
      expect(id.gt(0)).to.be.true;
    });

    it('adds the info into mapping', async () => {
      expect((await contract.contractAddress(id)).toLowerCase()).to.be.equal(address);
      expect(await contract.name(id)).to.be.equal('DAI');
      expect(await contract.decimals(id)).to.be.equal(ethers.BigNumber.from(18));
    });
  });

  describe('uri(id)', async function () {
    let contract, daiId, address;

    beforeEach(async function () {
      address = '0x95b58a6bff3d14b7db2f5cb5f0ad413dc2940658'.toLowerCase();
      contract = await MultiToken.deploy('Postfix');
      await contract.deployed();
      await contract.createToken(address, 'DAI', 10);
      daiId = await contract.addressToId(address);
    });

    it('generates uri for ETH as 0x0 address', async () => {
      const base64String = (await contract.uri(1)).split(',')[1];
      const uriResponse = Buffer.from(base64String, 'base64');
      const jsonResponse = JSON.parse(uriResponse);
      expect(jsonResponse.name).to.equal('ETHPostfix');
      expect(jsonResponse.decimals).to.equal(18);
      expect(jsonResponse.attributes[0].value.toLowerCase()).to.equal(ethers.constants.AddressZero.toLowerCase());
    });

    it('generates uri for DAI as DAI address', async () => {
      const base64String = (await contract.uri(daiId)).split(',')[1];
      const uriResponse = Buffer.from(base64String, 'base64');
      const jsonResponse = JSON.parse(uriResponse);
      expect(jsonResponse.name).to.equal('DAIPostfix');
      expect(jsonResponse.decimals).to.equal(10);
      expect(jsonResponse.attributes[0].value.toLowerCase()).to.equal(address);
    });
  });
});
