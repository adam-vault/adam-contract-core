const hre = require('hardhat');
const { faker } = require('@faker-js/faker');

// rinkeby
const governAddress = '0xbef9b7a6a96167ca7198698f4f7cec8ba246c8cf';
const daoAddress = '0x82AB616156DEAF08f13Db4A019fD651a25662cBF';
const transferERC20BudgetApprovalAddress = '0x0a50cC91095f00B06e4eA51423a6B87ccA1BFac5';
const uniswapBudetApprovalAddress = '0x9340c400391EdF7E61b813fFf7c85c93c4f09792';
const DAIAddress = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735';

async function main () {
  const govern = await hre.ethers.getContractAt('Govern', governAddress);
  const dao = await hre.ethers.getContractAt('Dao', daoAddress);

  const transferERC20BudgetApproval = await hre.ethers.getContractAt('TransferERC20BudgetApproval', transferERC20BudgetApprovalAddress);
  const dataERC20 = transferERC20BudgetApproval.interface.encodeFunctionData('initialize',
    [[
      // dao address
      daoAddress,
      // executor
      '0xBfAA947b65A4350f14895980D0c8f420576fC163',
      // approvers
      ['0x525BaB223a5F7D3E81699995DaA92fAe7329C5D9'],
      // text
      'Transfer ERC20',
      // transaction type
      'Outflow',
      // allow all addresses,
      false,
      // allowed addresses (use when above = false)
      ['0xBfAA947b65A4350f14895980D0c8f420576fC163'],
      // alow all tokens,
      false,
      // allowed token (use when above = false)
      [DAIAddress],
      // allow any amount
      false,
      // allowed total amount
      hre.ethers.utils.parseEther('1000'),
      // allowed amount percentage
      '10',
    ]]);

  const uniswapBudgetApproval = await hre.ethers.getContractAt('UniswapBudgetApproval', uniswapBudetApprovalAddress);
  const dataUniswap = uniswapBudgetApproval.interface.encodeFunctionData('initialize((address,address,address[],string,string,bool,address[],bool,address[],bool,uint256,uint8),bool,address[])',
    [
      // common params
      [
      // dao address
        daoAddress,
        // executor
        '0xBfAA947b65A4350f14895980D0c8f420576fC163',
        // approvers
        [],
        // text
        'Uniswap',
        // transaction type
        'Swap',
        // allow all addresses,
        false,
        // allowed addresses (use when above = false)
        ['0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'],
        // alow all tokens,
        true,
        // allowed token (use when above = false)
        [],
        // allow any amount
        true,
        // allowed total amount
        hre.ethers.utils.parseEther('0'),
        // allowed amount percentage
        '100',
      ],
      // extra params
      // allow all to tokens,
      true,
      // allowed to token (use when above = false)
      [],
    ]);

  const calldata = dao.interface.encodeFunctionData('createBudgetApprovals', [
    [transferERC20BudgetApprovalAddress, uniswapBudetApprovalAddress],
    [dataERC20, dataUniswap],
  ]);
  await govern.propose([daoAddress], [0], [calldata], faker.commerce.productDescription());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
