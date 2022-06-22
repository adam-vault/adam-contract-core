
const { faker } = require('@faker-js/faker');
const { ethers } = require('hardhat');

const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

function getCreateDaoParams ({
  // defaut Dao Setting
  name = faker.company.companyName(),
  description = faker.commerce.productDescription(),
  lockTime = 0,
  budgetApproval = [300, 3000, 5000, 0],
  revokeBudgetApproval = [300, 3000, 5000, 0],
  general = [300, 3000, 5000, 0],
  daoSettingApproval = [300, 3000, 5000, 0],
  tokenInfo = [`${faker.company.companyName()}Token`, 'MT'],
  tokenAmount = 100,
  minDepositAmount = 0,
  minTokenToAdmit = 0,
  admissionToken = ethers.constants.AddressZero,
  depositTokens = [ETH],
  mintMemberToken = false,
  baseCurrency = ETH,
}) {
  return Object.entries({
    name,
    description,
    lockTime,
    budgetApproval,
    revokeBudgetApproval,
    general,
    daoSettingApproval,
    tokenInfo,
    tokenAmount,
    minDepositAmount,
    minTokenToAdmit,
    admissionToken,
    depositTokens,
    mintMemberToken,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
};

module.exports = {
  getCreateDaoParams,
};
