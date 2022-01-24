// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
require('dotenv').config();

async function main () {
    // const [signer] = await hre.ethers.getSigners();
   
    // const LINK = await new hre.ethers.Contract('0xa36085f69e2889c224210f603d836748e7dc0088', abi, signer);
    // console.log('=======', await LINK.allowance('0x6eB05064e720EA87E2e1D48E266283B484673276', '0x526167a0D3dA15C9b17d3b9F5070349CD74E4E10'));
    // await LINK.approve('0x526167a0D3dA15C9b17d3b9F5070349CD74E4E10', 100000000);

    const treasury = await hre.ethers.getContractAt('TestTreasury', '0x4CD1B23B538C08cBFaed0f7729744a908a198a3D');
    await treasury.exchangeEVE(
        '0x6eB05064e720EA87E2e1D48E266283B484673276',
        '0xa36085F69e2889c224210F603D836748e7dC0088',
        100,
    );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
