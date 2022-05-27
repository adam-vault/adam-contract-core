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
import "../lib/Constant.sol";

contract PriceResolver is Initializable {
    address public baseCurrency;

    function __PriceResolver_init(address _baseCurrency) internal onlyInitializing {
        baseCurrency = _baseCurrency;
    }

    function assetBaseCurrencyPrice(address asset, uint256 amount) public view returns (uint256) {
        if (asset == baseCurrency)
            return amount;

        (, int price,,,) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(asset, baseCurrency);
        if (price > 0) {
            return uint256(price) * amount / 10 ** IERC20Metadata(asset).decimals();
        }
        return 0;
    }

    function baseCurrencyDecimals() public view returns (uint8) {
        if (baseCurrency == Denominations.ETH) return 18;
        try IERC20Metadata(baseCurrency).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    function canResolvePrice(address asset) public view returns (bool) {
        if (asset == Denominations.ETH || asset == Constant.WETH_ADDRESS)
            return true;
        try FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(asset, Denominations.ETH) {
            return true;
        } catch (bytes memory /*lowLevelData*/) {
            return false;
        }
    }
}