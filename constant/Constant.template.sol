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

    address public constant UNISWAP_ROUTER = {{ UNISWAP_ROUTER }};
    address public constant NATIVE_TOKEN = {{ NATIVE_TOKEN }};
    address public constant WRAP_NATIVE_TOKEN = {{ WRAP_NATIVE_TOKEN }};
    address public constant WETH_ADDRESS = {{ WETH_ADDRESS }};
    
    uint public constant STALE_PRICE_DELAY = {{ STALE_PRICE_DELAY }};
}
