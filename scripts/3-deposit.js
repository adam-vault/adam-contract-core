const hre = require('hardhat');
const ethers = require('ethers');
const inquirer = require('inquirer');

const toBigNumber = (val, decimals) => {
  if (val._isBigNumber) {
    return val;
  }

  const [integerStr, decimalStr = ''] = val.split('.');
  const bnStr = integerStr + decimalStr.substring(0, decimals).padEnd(decimals, '0');
  return ethers.BigNumber.from(bnStr);
};

async function main () {
  inquirer
    .prompt([
      { type: 'input', name: 'daoAddress', message: 'Dao contract address?', default: '0xC6e1Ca4b8e9ceAa7A0cC82Cc13A6F991bcB48453' },
      {
        type: 'list',
        name: 'dest',
        message: 'To where?',
        default: 0,
        choices: ['Treasury', 'LiquidPool'],
      },

      {
        type: 'list',
        name: 'token',
        message: 'What kind of deposit?',
        default: 0,
        choices: ['ERC20', 'ETH'],
      },
      { type: 'input', name: 'tokenAddress', message: 'ERC20 Address?', when: ({ token }) => token === 'ERC20' },
      { type: 'input', name: 'amount', message: 'How much?', default: '0.001' },
    ])
    .then(async ({
      dest, tokenAddress, token, daoAddress, amount
    }) => {
      if (dest === 'Treasury') {
        if (token === 'ETH') {
          const [signer] = await hre.ethers.getSigners();
          return signer.sendTransaction({
            to: daoAddress,
            value: ethers.utils.parseEther(amount),
          });
        } else {
          const erc20 = await hre.ethers.getContractAt('ERC20', tokenAddress);
          const decimals = await erc20.decimals();
          return erc20.transfer(daoAddress, toBigNumber(amount, decimals));
        }
      } else {
        const dao = await hre.ethers.getContractAt('Dao', daoAddress);
        const lpAddress = await dao.liquidPool();
        const lp = await hre.ethers.getContractAt('LiquidPool', lpAddress);

        if (token === 'ETH') {
          return lp.deposit({ value: hre.ethers.utils.parseEther(amount) });
        } else {
          const erc20 = await hre.ethers.getContractAt('ERC20', tokenAddress);
          const decimals = await erc20.decimals();
          const amountBN = toBigNumber(amount, decimals);
          await erc20.approve(lpAddress, amountBN);
          return erc20.depositToken(tokenAddress, amountBN);
        }
      }
    })
    .then((tx) => {
      console.log(tx);
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
