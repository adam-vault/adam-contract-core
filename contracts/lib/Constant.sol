// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    bytes32 public constant BEACON_NAME_DAO = bytes32(keccak256("adam.dao"));
    bytes32 public constant BEACON_NAME_MEMBERSHIP = bytes32(keccak256("adam.dao.membership"));
    bytes32 public constant BEACON_NAME_MEMBER_TOKEN = bytes32(keccak256("adam.dao.member_token"));
    bytes32 public constant BEACON_NAME_LIQUID_POOL = bytes32(keccak256("adam.dao.liquid_pool"));
    bytes32 public constant BEACON_NAME_GOVERN = bytes32(keccak256("adam.dao.govern"));
    bytes32 public constant BEACON_NAME_TEAM = bytes32(keccak256("adam.dao.team"));
    bytes32 public constant BEACON_NAME_ACCOUNTING_SYSTEM = bytes32(keccak256("adam.dao.accounting_system"));

    address public constant WETH_ADDRESS = 0x40155AD14A14C6F7A3116dafb279160D9761c606;
    address public constant MATIC_ADDRESS = 0x0000000000000000000000000000000000001010;
    address public constant WMATIC_ADDRESS = 0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889;
    address public constant UNISWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant FEED_REGISTRY = 0xe74B6321545aD397E08AdB12d83983eB8e6F4062;
    address public constant BRIDGE_CURRENCY = 0x0000000000000000000000000000000000000348;
    address public constant NATIVE_TOKEN = 0x0000000000000000000000000000000000001010;
    uint public constant STALE_PRICE_DELAY = 86400;
}
