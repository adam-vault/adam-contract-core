
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

function getCreateTransferERC20BAParams ({
  dao,
  executor,
  approvers,
  minApproval,
  text = 'Transfer Illiquid Token',
  transactionType = 'Outflow',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses = false,
  toAddresses,
  token,
  allowAnyAmount = false,
  totalAmount = '100',
  amountPercentage = '10',
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      approvers,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    allowAllAddresses,
    toAddresses,
    token,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateTransferLiquidErc20TokenBAParams ({
  dao,
  executor,
  approvers = [],
  minApproval = 0,
  text = 'Transfer ERC20 Token',
  transactionType = 'outflow liquid',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses = false,
  toAddresses,
  tokens,
  allowAnyAmount = false,
  totalAmount = ethers.utils.parseEther('100'),
  amountPercentage = '10',
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      approvers,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    allowAllAddresses,
    toAddresses,
    tokens,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateUniswapBAParams ({
  dao,
  executor,
  approvers = [],
  minApproval = 0,
  text = 'Uniswap',
  transactionType = 'swap',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  fromTokens,
  allowAllToTokens = false,
  toTokens,
  allowAnyAmount = false,
  totalAmount = ethers.utils.parseEther('100'),
  amountPercentage = '10',
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      approvers,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
    }),
    fromTokens,
    allowAllToTokens,
    toTokens,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateCommonBudgetApprovalParams ({
  dao,
  executor,
  approvers = [],
  minApproval = 0,
  text,
  transactionType,
  startTime = Math.round(Date.now() / 1000) - 86400,
  endTime = Math.round(Date.now() / 1000) + 86400,
  allowUnlimitedUsageCount = false,
  usageCount = 10,
}) {
  return Object.entries({
    dao,
    executor,
    approvers,
    minApproval,
    text,
    transactionType,
    startTime,
    endTime,
    allowUnlimitedUsageCount,
    usageCount,
  }).map(([key, value]) => {
    return value;
  });
}
module.exports = {
  getCreateDaoParams,
  getCreateTransferERC20BAParams,
  getCreateTransferLiquidErc20TokenBAParams,
  getCreateUniswapBAParams,
};
