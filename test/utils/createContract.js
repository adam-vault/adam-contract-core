const { ethers, upgrades } = require('hardhat');

const createBudgetApprovals = async (signer) => {
    const TransferLiquidERC20BudgetApproval = await ethers.getContractFactory(
        'TransferLiquidERC20BudgetApproval',
        { signer },
    );
    const transferLiquidERC20BudgetApproval =
        await TransferLiquidERC20BudgetApproval.deploy();
    await transferLiquidERC20BudgetApproval.deployed();

    const UniswapLiquidBudgetApproval = await ethers.getContractFactory(
        'UniswapLiquidBudgetApproval',
    );
    const uniswapLiquidBudgetApproval =
        await UniswapLiquidBudgetApproval.deploy();
    await uniswapLiquidBudgetApproval.deployed();

    const TransferERC721BudgetApproval = await ethers.getContractFactory(
        'TransferERC721BudgetApproval',
        { signer },
    );
    const transferERC721BudgetApproval =
        await TransferERC721BudgetApproval.deploy();
    await transferERC721BudgetApproval.deployed();

    const TransferERC20BudgetApproval = await ethers.getContractFactory(
        'TransferERC20BudgetApproval',
        { signer },
    );
    const transferERC20BudgetApproval =
        await TransferERC20BudgetApproval.deploy();
    await transferERC20BudgetApproval.deployed();

    return [
        transferLiquidERC20BudgetApproval.address,
        uniswapLiquidBudgetApproval.address,
        transferERC721BudgetApproval.address,
        transferERC20BudgetApproval.address,
    ];
};
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
        accountingSystem,
        ethPriceGateway,
        transferLiquidERC20BudgetApproval,
        uniswapLiquidBudgetApproval,
        transferERC721BudgetApproval,
        transferERC20BudgetApproval,
    ] = await Promise.all(
        [
            'MockDao',
            'Membership',
            'Govern',
            'MemberToken',
            'Team',
            'AccountingSystem',
            'EthereumChainlinkPriceGateway',
            'TransferLiquidERC20BudgetApproval',
            'UniswapLiquidBudgetApproval',
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
        [
            ethers.utils.id('adam.dao.accounting_system'),
            accountingSystem.address,
        ],
    ]);
    console.log('MC: ~ file: createContract.js:97 ~ createAdam ~ beacon:');

    const adam = await upgrades.deployProxy(
        Adam,
        [
            beacon.address,
            [
                transferLiquidERC20BudgetApproval.address,
                uniswapLiquidBudgetApproval.address,
                transferERC721BudgetApproval.address,
                transferERC20BudgetApproval.address,
            ],
            [ethPriceGateway.address],
        ],
        { kind: 'uups' },
    );
    console.log('MC: ~ file: createContract.js:113 ~ createAdam ~ adam:');

    await adam.deployed();

    return {
        adam,
        ethPriceGateway,
        dao,
        membership,
        govern,
        memberToken,
        team,
        accountingSystem,
        beacon,
        transferLiquidERC20BudgetApproval,
        uniswapLiquidBudgetApproval,
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

const createGovern = async () => {
    const [creator] = await ethers.getSigners();

    const TokenA = await ethers.getContractFactory('TokenA');
    const tokenA = await TokenA.deploy();
    await tokenA.deployed();

    const Govern = await ethers.getContractFactory('Govern', {
        signer: creator,
    });
    const govern = await Govern.deploy(
        tokenA.address,
        '123',
        1,
        1,
        1,
        [1],
        [tokenA.address],
    );

    await govern.deployed();
    return govern;
};

module.exports = {
    createAdam,
    createTokens,
    createGovern,
    createBudgetApprovals,
};
