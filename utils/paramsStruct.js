
const { faker } = require('@faker-js/faker');
const { ethers } = require('hardhat');

const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

function getCreateDaoParams ({
  // defaut Dao Setting
  name = faker.company.companyName(),
  description = faker.commerce.productDescription(),
  lockTime = 0,
  generalGovernSetting = [300, 3000, 5000, 0],
  tokenInfo = [`${faker.company.companyName()}Token`, 'MT'],
  tokenAmount = 100,
  minDepositAmount = 0,
  minTokenToAdmit = 0,
  admissionToken = ethers.constants.AddressZero,
  depositTokens = [ETH],
  mintMemberToken = false,
  baseCurrency = ETH,
  logoCID = '',
}) {
  return Object.entries({
    name,
    description,
    lockTime,
    generalGovernSetting,
    tokenInfo,
    tokenAmount,
    minDepositAmount,
    minTokenToAdmit,
    admissionToken,
    depositTokens,
    mintMemberToken,
    baseCurrency,
    logoCID,
  }).map(([key, value]) => {
    return value;
  });
};

function getCreateTransferERC20BAParams ({
  dao,
  executor,
  executorTeamId,
  approvers,
  approverTeamId,
  minApproval,
  text = 'Transfer Illiquid Token',
  transactionType = 'outflow',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses = false,
  toAddresses,
  allowAllTokens = false,
  token,
  allowAnyAmount = false,
  totalAmount = '100',
  amountPercentage = '10',
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
      team,
    }),
    allowAllAddresses,
    toAddresses,
    allowAllTokens,
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
  executorTeamId,
  approvers = [],
  approverTeamId,
  minApproval = 0,
  text = 'Transfer Liquid ERC20 Token',
  transactionType = 'outflowLiquid',
  startTime,
  endTime,
  allowUnlimitedUsageCount,
  usageCount,
  allowAllAddresses = false,
  toAddresses = [],
  tokens = [],
  allowAnyAmount = false,
  totalAmount = ethers.utils.parseEther('100'),
  amountPercentage = '10',
  baseCurrency = ETH,
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
      team,
    }),
    allowAllAddresses,
    toAddresses,
    tokens,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateUniswapBAParams ({
  dao,
  executor,
  executorTeamId,
  approvers = [],
  approverTeamId,
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
  baseCurrency = ETH,
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
      team,
    }),
    fromTokens,
    allowAllToTokens,
    toTokens,
    allowAnyAmount,
    totalAmount,
    amountPercentage,
    baseCurrency,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateTransferERC721BAParams ({
  dao,
  executor,
  executorTeamId,
  approvers = [],
  approverTeamId,
  minApproval = 0,
  text = 'Transfer ERC721',
  transactionType = '721outflow',
  startTime = Math.round(Date.now() / 1000) - 86400,
  endTime = Math.round(Date.now() / 1000) + 86400,
  allowUnlimitedUsageCount = false,
  usageCount = 10,
  allowAllAddresses = false,
  toAddresses = [],
  allowAllTokens = false,
  tokens = [],
  allowAnyAmount = false,
  totalAmount = 10,
  team,
}) {
  return Object.entries({
    params: getCreateCommonBudgetApprovalParams({
      dao,
      executor,
      executorTeamId,
      approvers,
      approverTeamId,
      minApproval,
      text,
      transactionType,
      startTime,
      endTime,
      allowUnlimitedUsageCount,
      usageCount,
      team,
    }),
    allowAllAddresses,
    toAddresses,
    allowAllTokens,
    tokens,
    allowAnyAmount,
    totalAmount,
  }).map(([key, value]) => {
    return value;
  });
}

function getCreateCommonBudgetApprovalParams ({
  dao,
  executor = ethers.constants.AddressZero,
  executorTeamId = 0,
  approvers = [],
  approverTeamId = 0,
  minApproval = 0,
  text,
  transactionType,
  startTime = Math.round(Date.now() / 1000) - 86400,
  endTime = Math.round(Date.now() / 1000) + 86400,
  allowUnlimitedUsageCount = false,
  usageCount = 10,
  team,
}) {
  return Object.entries({
    dao,
    executor,
    executorTeamId,
    approvers,
    approverTeamId,
    minApproval,
    text,
    transactionType,
    startTime,
    endTime,
    allowUnlimitedUsageCount,
    usageCount,
    team,
  }).map(([key, value]) => {
    return value;
  });
}
module.exports = {
  getCreateDaoParams,
  getCreateTransferERC20BAParams,
  getCreateTransferLiquidErc20TokenBAParams,
  getCreateUniswapBAParams,
  getCreateTransferERC721BAParams,
};
