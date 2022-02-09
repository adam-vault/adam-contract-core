// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
require('dotenv').config();
const abi = [
    {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      }
];

async function main () {
    const [signer] = await hre.ethers.getSigners();
    const provider = await hre.ethers.getDefaultProvider('https://eth-kovan.alchemyapi.io/v2/ZILdPh7v4040WanO-SV3JFj6ic6SQieq');
   
    /**
     * Using LINK as testing
     * approve(spender, amount)
     * allowance(owner, spender)
    */
    // const LINK = await new hre.ethers.Contract('0xa36085F69e2889c224210F603D836748e7dC0088', abi, signer);
    // await LINK.approve('0x2338F97eaeC8582b328b429Fa15A10419668D555', '9000000000000000000');
    // console.log("=====approved===");
    const treasury = await hre.ethers.getContractAt('Treasury', '0x2338F97eaeC8582b328b429Fa15A10419668D555');

    console.log("===exchange eve====", await treasury.estimateGas.exchangeEVE2(
        '0x6eB05064e720EA87E2e1D48E266283B484673276',
        '0xa36085F69e2889c224210F603D836748e7dC0088',
        10**9,
    ));

    console.log("=====getEVEPrice======", await treasury.estimateGas.getEVEPrice());
    const logs = await provider.getLogs({
        address: '0x2338F97eaeC8582b328b429Fa15A10419668D555',
        fromBlock: 0,
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
