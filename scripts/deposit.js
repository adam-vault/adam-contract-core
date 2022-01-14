const hre = require("hardhat");

// ropsten
const AssetManagerAddress = '0x059A2a91291f292eE6Be0ee262DA7C41185989Ab';
const ToStringAddress = '0x02897463e921e8b3a19eC704DC206e84faB2F60F';

async function main() {
  const AssetManager = await hre.ethers.getContractFactory("AssetManager", {
    libraries: {
      ToString: ToStringAddress,
    },
  });
  const Strategy = await hre.ethers.getContractFactory("Strategy", {
    libraries: {
      ToString: ToStringAddress,
    },
  });
  const assetManager = await AssetManager.attach(AssetManagerAddress);

  const strategyAddress = await assetManager.strategyList(0);
  const strategy = await Strategy.attach(strategyAddress);

  const depositTx = await strategy.deposit({ value: ethers.utils.parseEther("0.000234") });
  await depositTx.wait();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
