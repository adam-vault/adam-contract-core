// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.3. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IAccountSystem {
    error AccessDenied(string category);
    error InputLengthNotMatch(uint256 count1, uint256 count2);
    error PairNotSupport(address asset, address base);
    error PriceGatewayExist(address priceGateway);
    error PriceGatewayOmit(address priceGateway);
    event AddPriceGateway(address priceGateway);
    event AdminChanged(address previousAdmin, address newAdmin);
    event BeaconUpgraded(address indexed beacon);
    event Initialized(uint8 version);
    event Upgraded(address indexed implementation);

    function addPriceGateway(address priceGateway) external;

    function assetPrice(
        address asset,
        address base,
        uint256 amount
    ) external view returns (uint256);

    function dao() external view returns (address);

    function defaultPriceGateway() external view returns (address);

    function initialize(address owner, address[] memory _priceGateways)
        external;

    function isSupportedPair(address asset, address base)
        external
        view
        returns (bool);

    function priceGateways(address) external view returns (bool);

    function proxiableUUID() external view returns (bytes32);

    function setTokenPairPriceGatewayMap(
        address[] memory _assets,
        address[] memory _bases,
        address priceGateway
    ) external;

    function tokenPairPriceGatewayMap(address, address)
        external
        view
        returns (address);

    function upgradeTo(address newImplementation) external;

    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"string","name":"category","type":"string"}],"name":"AccessDenied","type":"error"},{"inputs":[{"internalType":"uint256","name":"count1","type":"uint256"},{"internalType":"uint256","name":"count2","type":"uint256"}],"name":"InputLengthNotMatch","type":"error"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"address","name":"base","type":"address"}],"name":"PairNotSupport","type":"error"},{"inputs":[{"internalType":"address","name":"priceGateway","type":"address"}],"name":"PriceGatewayExist","type":"error"},{"inputs":[{"internalType":"address","name":"priceGateway","type":"address"}],"name":"PriceGatewayOmit","type":"error"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"priceGateway","type":"address"}],"name":"AddPriceGateway","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"inputs":[{"internalType":"address","name":"priceGateway","type":"address"}],"name":"addPriceGateway","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"address","name":"base","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"assetPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"dao","outputs":[{"internalType":"contract IDao","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"defaultPriceGateway","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address[]","name":"_priceGateways","type":"address[]"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"address","name":"base","type":"address"}],"name":"isSupportedPair","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"priceGateways","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"_assets","type":"address[]"},{"internalType":"address[]","name":"_bases","type":"address[]"},{"internalType":"address","name":"priceGateway","type":"address"}],"name":"setTokenPairPriceGatewayMap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"tokenPairPriceGatewayMap","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"}]
*/
