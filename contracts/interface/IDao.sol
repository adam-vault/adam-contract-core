// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.2. SEE SOURCE BELOW. !!
pragma solidity ^0.8.0;
import "../lib/SharedStruct.sol";

interface IDao {
    event AdminChanged(address previousAdmin, address newAdmin);
    event ApprovalForAll(
        address indexed account,
        address indexed operator,
        bool approved
    );
    event BeaconUpgraded(address indexed beacon);
    event CreateBudgetApproval(address budgetApproval);
    event CreateToken(uint256 id, address contractAddress);
    event SwapToken(
        address _portfolio,
        uint256 _src,
        uint256 _dst,
        uint256 _srcAmount,
        uint256 _dstAmount
    );
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event URI(string value, uint256 indexed id);
    event Upgraded(address indexed implementation);

    function ETH_ADDRESS() external view returns (address);

    function adam() external view returns (address);

    function addressToId(address) external view returns (uint256);

    function balanceOf(address account, uint256 id)
        external
        view
        returns (uint256);

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
        external
        view
        returns (uint256[] memory);

    function budgetApprovals(address) external view returns (bool);

    function config()
        external
        view
        returns (uint256 locktime, bool allowAllTokens);

    function createBudgetApprovals(
        address[] memory _budgetApprovals,
        bytes[] memory data
    ) external;

    function creator() external view returns (address);

    function deposit() external payable;

    function depositByBudgetApproval(
        address _token,
        address[] memory _members,
        uint256[] memory _amounts,
        bool transferred
    ) external returns (uint256 totalAmount);

    function depositToken(address _token, uint256 _amount) external;

    function ethId() external view returns (uint256);

    function executeTransactionByBudgetApprovals(
        address budgetApproval,
        bytes memory data
    ) external;

    function firstDeposit(address) external view returns (uint256);

    function getMintedContracts() external view returns (address[] memory);

    function getTokenId(address _token) external view returns (uint256);

    function initialize(
        address _adam,
        address _creator,
        string memory _name,
        string memory _symbol,
        address _membership,
        uint256 _locktime,
        address[] memory _depositTokens
    ) external;

    function isApprovedForAll(address account, address operator)
        external
        view
        returns (bool);

    function lastTokenId() external view returns (uint256);

    function membership() external view returns (address);

    function name() external view returns (string memory);

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external returns (bytes4);

    function redeem(uint256 _amount) external;

    function redeemToken(address _token, uint256 _amount) external;

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external;

    function setApprovalForAll(address operator, bool approved) external;

    function setName(string memory _name) external;

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function symbol() external view returns (string memory);

    function tokenAddress(uint256 _id) external view returns (address);

    function tokenDecimals(uint256 _id) external view returns (uint8);

    function tokenName(uint256 _id) external view returns (string memory);

    function tokenTotalSupply(uint256 _id) external view returns (uint256);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;

    function uri(uint256 _id) external view returns (string memory);

    function withdrawByBudgetApproval(
        address _token,
        address[] memory _members,
        uint256[] memory _amounts,
        bool transferred
    ) external returns (uint256 totalAmount);

    function setGovernFactory(address _governFactory) external;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"budgetApproval","type":"address"}],"name":"CreateBudgetApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"}],"name":"CreateToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"_portfolio","type":"address"},{"indexed":false,"internalType":"uint256","name":"_src","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_dst","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_srcAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_dstAmount","type":"uint256"}],"name":"SwapToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"indexed":false,"internalType":"uint256[]","name":"values","type":"uint256[]"}],"name":"TransferBatch","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"TransferSingle","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"value","type":"string"},{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"URI","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[],"name":"ETH_ADDRESS","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"adam","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"addressToId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"accounts","type":"address[]"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"}],"name":"balanceOfBatch","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"budgetApprovals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"config","outputs":[{"internalType":"uint256","name":"locktime","type":"uint256"},{"internalType":"bool","name":"allowAllTokens","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_budgetApprovals","type":"address[]"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"createBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"creator","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"deposit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"address[]","name":"_members","type":"address[]"},{"internalType":"uint256[]","name":"_amounts","type":"uint256[]"},{"internalType":"bool","name":"transferred","type":"bool"}],"name":"depositByBudgetApproval","outputs":[{"internalType":"uint256","name":"totalAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"depositToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"ethId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"budgetApproval","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"executeTransactionByBudgetApprovals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"firstDeposit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMintedContracts","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"}],"name":"getTokenId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_adam","type":"address"},{"internalType":"address","name":"_creator","type":"address"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"},{"internalType":"address","name":"_membership","type":"address"},{"internalType":"uint256","name":"_locktime","type":"uint256"},{"internalType":"address[]","name":"_depositTokens","type":"address[]"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastTokenId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"membership","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"redeem","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"redeemToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256[]","name":"ids","type":"uint256[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeBatchTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"setName","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"tokenAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"tokenDecimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"tokenName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"tokenTotalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_id","type":"uint256"}],"name":"uri","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_token","type":"address"},{"internalType":"address[]","name":"_members","type":"address[]"},{"internalType":"uint256[]","name":"_amounts","type":"uint256[]"},{"internalType":"bool","name":"transferred","type":"bool"}],"name":"withdrawByBudgetApproval","outputs":[{"internalType":"uint256","name":"totalAmount","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}]
*/
