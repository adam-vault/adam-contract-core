// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../AssetManager.sol";

contract MockAssetManagerV2 is AssetManager {
    function v2() public pure returns (bool) {
        return true;
    }
}