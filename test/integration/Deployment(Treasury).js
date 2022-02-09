// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const { createAdam } = require('../utils/createContract');

// describe('Deployment(Treasury)', function () {
//   let creator;
//   let treasury;

//   before(async function () {
//     [creator] = await ethers.getSigners();
//     const { adam } = await createAdam();
//     const PriceConverter = await ethers.getContractFactory('PriceConverter');
//     const priceConverter = await PriceConverter.deploy();
//     await priceConverter.deployed();

//     const Treasury = await ethers.getContractFactory('TestTreasury');
//     treasury = await Treasury.deploy(
//       adam.address,
//       priceConverter.address,
//     );
//     await treasury.deployed();
//   });

//   describe('when initialize Treasury', function () {
//     it('has an array of basketCoins', async function () {
//         expect(await treasury.basketCoins(0)).to.be.eq("BTC");
//     });

//     it('has an array of basket', async function () {
//         expect(await treasury.basket("BTC")).to.be.eq("100");
//     });

//     it('has an price feed', async function () {
//         const priceFeed = await treasury.priceFeed("BTC/USD");

//         expect(typeof priceFeed).to.be.eq("string");
//     });

//     it('should exchange eve', async function () {
//         const exchangeEve = await treasury.exchangeEVE();
//     })
//   });
// });