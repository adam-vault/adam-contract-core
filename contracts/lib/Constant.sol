// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;

library Constant {
    bytes32 public constant BEACON_NAME_DAO = bytes32(keccak256("adam.dao"));
    bytes32 public constant BEACON_NAME_MEMBERSHIP = bytes32(keccak256("adam.dao.membership"));
    bytes32 public constant BEACON_NAME_MEMBER_TOKEN = bytes32(keccak256("adam.dao.member_token"));
    bytes32 public constant BEACON_NAME_LIQUID_POOL = bytes32(keccak256("adam.dao.liquid_pool"));
    bytes32 public constant BEACON_NAME_GOVERN = bytes32(keccak256("adam.dao.govern"));
    bytes32 public constant BEACON_NAME_TEAM = bytes32(keccak256("adam.dao.team"));

    address public constant WETH_ADDRESS = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;
    address public constant UNISWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant FEED_REGISTRY = 0xaBC30D61D30f19de38897EBA18252868B3459664;
    address public constant BRIDGE_CURRENCY = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint public constant BLOCK_NUMBER_IN_SECOND = 13;
    uint public constant STALE_PRICE_DELAY = 86400;
}
