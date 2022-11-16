const { ethers, testUtils } = require('hardhat');

const createV1Dao = async (adam,
  creator, memberShip, liquidPool, governFactory, team, memberToken, token) => {
  const adamAsSigner = await testUtils.address.impersonate(adam);
  const ERC1967Proxy = await ethers.getContractFactory('ERC1967Proxy', { signer: adamAsSigner });
  const daoV1Articfact = require('../../legacy/v1/artifacts/contracts/Dao.sol/Dao');
  const Dao = await ethers.getContractFactoryFromArtifact(daoV1Articfact, { signer: adamAsSigner });
  const implDao = await Dao.deploy();
  const proxyDao = await ERC1967Proxy.deploy(implDao.address, '0x');

  const dao = await ethers.getContractAtFromArtifact(daoV1Articfact, proxyDao.address, adamAsSigner);
  await dao.initialize([
    creator,
    memberShip,
    liquidPool,
    governFactory,
    team,
    memberToken,
    'Name',
    'Description',
    0,
    [0, 0, 0, 0],
    ['tokenName', 'T1'],
    0,
    [0],
    ['0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'],
    false,
    [
      [token, 10, 0, false],
    ],
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    '',
  ]);
  return dao;
};

module.exports = {
  createV1Dao,
};
