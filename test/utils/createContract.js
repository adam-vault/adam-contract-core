const { ethers, upgrades } = require('hardhat');

const { ADDRESS_ETH, ADDRESS_MOCK_AGGRGATOR } = require('./constants');

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

const createFeedRegistry = async (token, signer) => {
    const FeedRegistry = await ethers.getContractFactory('MockFeedRegistry', {
        signer,
    });
    const feedRegistry = await FeedRegistry.deploy();
    await feedRegistry.setPrice(
        token.address,
        ADDRESS_ETH,
        ethers.utils.parseEther('0.0046'),
    );
    await feedRegistry.setAggregator(
        token.address,
        ADDRESS_ETH,
        ADDRESS_MOCK_AGGRGATOR,
    );
    return feedRegistry;
};

const createAndDeploy = async (contractName, signer) => {
    const contractFactory = await ethers.getContractFactory(contractName);
    const contract = await contractFactory.deploy();
    await contract.deployed();
    return contract;
};
const createAdam = async () => {
    const [creator] = await ethers.getSigners();

    const [
        dao,
        membership,
        govern,
        liquidPool,
        memberToken,
        team,
        accountingSystem,
        ethPriceGateway,
        transferLiquidERC20BudgetApproval,
        uniswapLiquidBudgetApproval,
        transferERC721BudgetApproval,
        transferERC20BudgetApproval,
        uniswapV3LiquidBudgetApproval,
    ] = await Promise.all(
        [
            'MockDao',
            'Membership',
            'Govern',
            'LiquidPool',
            'MemberToken',
            'Team',
            'AccountingSystem',
            'EthereumChainlinkPriceGateway',
            'TransferLiquidERC20BudgetApproval',
            'UniswapLiquidBudgetApproval',
            'TransferERC721BudgetApproval',
            'TransferERC20BudgetApproval',
            'UniswapV3LiquidBudgetApproval',
        ].map((contractName) => createAndDeploy(contractName, creator)),
    );

    const Adam = await ethers.getContractFactory('Adam', { signer: creator });

    const DaoBeacon = await ethers.getContractFactory('DaoBeacon', {
        signer: creator,
    });
    const beacon = await DaoBeacon.deploy('', [
        [ethers.utils.id('adam.dao'), dao.address],
        [ethers.utils.id('adam.dao.membership'), membership.address],
        [ethers.utils.id('adam.dao.member_token'), memberToken.address],
        [ethers.utils.id('adam.dao.liquid_pool'), liquidPool.address],
        [ethers.utils.id('adam.dao.govern'), govern.address],
        [ethers.utils.id('adam.dao.team'), team.address],
        [
            ethers.utils.id('adam.dao.accounting_system'),
            accountingSystem.address,
        ],
    ]);

    const adam = await upgrades.deployProxy(
        Adam,
        [
            beacon.address,
            [
                transferLiquidERC20BudgetApproval.address,
                uniswapLiquidBudgetApproval.address,
                transferERC721BudgetApproval.address,
                transferERC20BudgetApproval.address,
                uniswapV3LiquidBudgetApproval.address,
            ],
            [ethPriceGateway.address],
        ],
        { kind: 'uups' },
    );

    await adam.deployed();

    return {
        adam,
        ethPriceGateway,
        dao,
        membership,
        govern,
        liquidPool,
        memberToken,
        team,
        accountingSystem,
        beacon,
        transferLiquidERC20BudgetApproval,
        uniswapLiquidBudgetApproval,
        transferERC721BudgetApproval,
        transferERC20BudgetApproval,
        uniswapV3LiquidBudgetApproval,
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
    createFeedRegistry,
    createAdam,
    createTokens,
    createGovern,
    createBudgetApprovals,
};
