// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PriceResolver is Initializable, UUPSUpgradeable {
    FeedRegistryInterface public registry;
    function __PriceResolver_init(address feedRegistry) internal {
        registry = FeedRegistryInterface(feedRegistry);
    }
    function assetEthPrice(address asset, uint256 amount) public view returns (uint256) {
        if (asset == Denominations.ETH)
            return amount;

        (, int price,,,) = registry.latestRoundData(asset, Denominations.ETH);
        if (price > 0) {
            return uint256(price) * amount / 10 ** IERC20Metadata(asset).decimals();
        }
        return 0;
    }
    function canResolvePrice(address asset) public view returns (bool) {
        if (asset == Denominations.ETH)
            return true;
        try registry.getFeed(asset, Denominations.ETH) {
            return true;
        } catch (bytes memory /*lowLevelData*/) {
            return false;
        }
    }
    function _authorizeUpgrade(address) internal override virtual {}
}