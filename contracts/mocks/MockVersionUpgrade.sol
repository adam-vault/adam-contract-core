// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockVersionUpgrade is UUPSUpgradeable {
    function v2() public pure returns (bool) {
        return true;
    }
    function _authorizeUpgrade(address) internal pure override {}
}