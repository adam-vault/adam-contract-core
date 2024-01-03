const { ethers, upgrades } = require('hardhat');

const createAndDeploy = async (contractName, signer) => {
    const contractFactory = await ethers.getContractFactory(contractName);
    const contract = await contractFactory.deploy();
    await contract.deployed();
    return contract;
};
const createAdam = async () => {
    console.log('MC: ~ file: createContract.js:49 ~ createAdam ~ createAdam:');
    const [creator] = await ethers.getSigners();

    const [
        dao,
        membership,
        govern,
        memberToken,
        team,
        uniswapAnyTokenBudgetApproval,
        transferERC721BudgetApproval,
        transferERC20BudgetApproval,
    ] = await Promise.all(
        [
            'MockDao',
            'Membership',
            'Govern',
            'MemberToken',
            'Team',
            'UniswapAnyTokenBudgetApproval',
            'TransferERC721BudgetApproval',
            'TransferERC20BudgetApproval',
        ].map((contractName) => createAndDeploy(contractName, creator)),
    );

    const Adam = await ethers.getContractFactory('Adam', { signer: creator });
    console.log('MC: ~ file: createContract.js:81 ~ createAdam ~ Adam:');

    const DaoBeacon = await ethers.getContractFactory('DaoBeacon', {
        signer: creator,
    });
    const beacon = await DaoBeacon.deploy('', [
        [ethers.utils.id('adam.dao'), dao.address],
        [ethers.utils.id('adam.dao.membership'), membership.address],
        [ethers.utils.id('adam.dao.member_token'), memberToken.address],
        [ethers.utils.id('adam.dao.govern'), govern.address],
        [ethers.utils.id('adam.dao.team'), team.address],
    ]);
    console.log('MC: ~ file: createContract.js:97 ~ createAdam ~ beacon:');

    const adam = await upgrades.deployProxy(
        Adam,
        [
            beacon.address,
            [
                uniswapAnyTokenBudgetApproval.address,
                transferERC721BudgetApproval.address,
                transferERC20BudgetApproval.address,
            ],
        ],
        { kind: 'uups' },
    );
    console.log('MC: ~ file: createContract.js:113 ~ createAdam ~ adam:');

    await adam.deployed();

    return {
        adam,
        dao,
        membership,
        govern,
        memberToken,
        team,
        beacon,
        uniswapAnyTokenBudgetApproval,
        transferERC721BudgetApproval,
        transferERC20BudgetApproval,
    };
};

const createTokens = async () => {
    const TokenA = await ethers.getContractFactory('TokenA');
    const tokenA = await TokenA.deploy();
    await tokenA.deployed();

    const TokenB = await ethers.getContractFactory('TokenB');
    const tokenB = await TokenB.deploy();
    await tokenB.deployed();

    const TokenC721 = await ethers.getContractFactory('TokenC721');
    const tokenC721 = await TokenC721.deploy();
    await tokenC721.deployed();

    const TokenD1155 = await ethers.getContractFactory('TokenD1155');
    const tokenD1155 = await TokenD1155.deploy();
    await tokenD1155.deployed();

    return { tokenA, tokenB, tokenC721, tokenD1155 };
};

module.exports = {
    createAdam,
    createTokens,
};
