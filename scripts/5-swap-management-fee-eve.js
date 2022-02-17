// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
require('dotenv').config();
const { NonceManager } = require("@ethersproject/experimental");

async function main () {
    const [creator] = await hre.ethers.getSigners();
    const provider = await hre.ethers.getDefaultProvider('https://eth-kovan.alchemyapi.io/v2/ZILdPh7v4040WanO-SV3JFj6ic6SQieq');
   
    const adam = await hre.ethers.getContractAt('Adam', '0x6F2c52F10EFED95e7FF5E4d10C3f79d4d2387519');
    const treasury = await hre.ethers.getContractAt('Treasury', '0xDcca05DE86F65f262448916b6ECe0F6eC7637788');

    const linkToken = new hre.ethers.Contract('0xa36085F69e2889c224210F603D836748e7dC0088', [
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_to",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {
                    "name": "_owner",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "name": "balance",
                    "type": "uint256"
                }
            ],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
    ], creator);

    const nonceManager = new NonceManager(creator);

    let tx = await adam.createAssetManager('Manager1');
    await tx.wait();

    const managerAddr = await adam.assetManagers(0);
    console.log("===Asset manager===", managerAddr);

    const assetManager1 = await ethers.getContractAt('AssetManager', managerAddr);
    
    nonceManager.incrementTransactionCount();
    tx = await assetManager1.approve(linkToken.address, treasury.address, hre.ethers.utils.parseEther('10'));
    await tx.wait();

    nonceManager.incrementTransactionCount();
    tx = await adam.createStrategy(assetManager1.address, 'Test1', false);
    await tx.wait();

    const strategy1Addr = await adam.publicStrategies(0);
    const strategy1 = await ethers.getContractAt('Strategy', strategy1Addr);
    console.log("====strategy1====", strategy1Addr);

    nonceManager.incrementTransactionCount();
    tx = await strategy1.deposit({ value: ethers.utils.parseEther('0.01') });
    await tx.wait();
    console.log("===Balance of asset manager==", (await provider.getBalance(assetManager1.address)) / (10 ** 18));

    const mgtFeeAddr1 = await strategy1.mtFeeAccount();
    const mgtFee1 = await ethers.getContractAt('ManagementFee', mgtFeeAddr1);
    console.log("=======mgtFee1=======", mgtFeeAddr1);
    
    nonceManager.incrementTransactionCount();
    tx = await mgtFee1.setBeneficiary(creator.address);
    await tx.wait();

    console.log("====Beneficiary set====")

    nonceManager.incrementTransactionCount();
    tx = await assetManager1.chargeManagementFee(linkToken.address, mgtFeeAddr1);
    await tx.wait();

    console.log("====Management fee charged====")

    nonceManager.incrementTransactionCount();
    await linkToken.transfer(assetManager1.address, hre.ethers.utils.parseEther('0.01'));
    await tx.wait();

    console.log("====link token transferred=====");
    
    console.log("Balance of managementFee(ether): ", (await assetManager1.balanceOf(mgtFeeAddr1, 1)) / (10**18));
    console.log("Balance of managementFee(LINK): ", (await assetManager1.balanceOf(mgtFeeAddr1, 2)) / (10**18));
    console.log("Balance of asset manager(ether):", (await provider.getBalance(assetManager1.address)) / (10**18));
    console.log("Balance of asset manager(LINK):", (await linkToken.balanceOf(assetManager1.address)) / (10**18));

    console.log("Balance of executor:", (await provider.getBalance(creator.address)) / (10**18));
    console.log("Estimated gas fee:", (await mgtFee1.estimateGas.redemption()) / (10**9));
    console.log("Treasury:", (await treasury.getEVEPrice()) / (10**8));

    console.log("====redemption start====");
    nonceManager.incrementTransactionCount();
    await mgtFee1.redemption();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
