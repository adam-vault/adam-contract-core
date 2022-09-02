// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IPeripheryImmutableState.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../lib/Constant.sol";

contract PriceResolver is Initializable {
    address private _baseCurrency;

    function __PriceResolver_init(address __baseCurrency) internal onlyInitializing {
        _baseCurrency = __baseCurrency;
    }

    function baseCurrency() public view virtual returns (address) {
        return _baseCurrency;
    }
    function _WETH9() internal view returns (address) {
        return IPeripheryImmutableState(Constant.UNISWAP_ROUTER).WETH9();
    }

    function assetBaseCurrencyPrice(address asset, uint256 amount) public view virtual returns (uint256) {
        address __baseCurrency = baseCurrency();
        if (asset == __baseCurrency)
            return amount;
        
        if(__baseCurrency == Denominations.ETH || __baseCurrency == _WETH9()) {
            return assetEthPrice(asset, amount);
        }

        if(asset == Denominations.ETH || asset == _WETH9()) {
            return ethAssetPrice(__baseCurrency, amount);
        }

        address baseCurrencyETHFeed = address(FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(__baseCurrency, Denominations.ETH));
        address assetETHFeed = address(FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(asset, Denominations.ETH));
        int price = getDerivedPrice(assetETHFeed, baseCurrencyETHFeed, baseCurrencyDecimals());
        if (price > 0) {
            return uint256(price) * amount / 10 ** IERC20Metadata(asset).decimals();
        }
        return 0;
    }

    function ethAssetPrice(address asset, uint256 ethAmount) public view virtual returns (uint256) {
        if (asset == Denominations.ETH || asset == _WETH9())
            return ethAmount;

        (, int price,,,) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(asset, Denominations.ETH);

        if (price > 0) {
            return ethAmount * (10 ** IERC20Metadata(asset).decimals()) / uint256(price);
        }

        return 0;
    }

    function assetEthPrice(address asset, uint256 amount) public view virtual returns (uint256) {
        if (asset == Denominations.ETH || asset == _WETH9())
            return amount;

        (, int price,,,) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(asset, Denominations.ETH);

        if (price > 0) {
            return uint256(price) * amount / 10 ** IERC20Metadata(asset).decimals();
        }

        return 0;
    }

    function getDerivedPrice(address _base, address _quote, uint8 _decimals)
        internal
        view
        virtual
        returns (int256)
    {
        require(_decimals > uint8(0) && _decimals <= uint8(18), "Invalid _decimals");
        int256 decimals = int256(10 ** uint256(_decimals));
        ( , int256 basePrice, , , ) = AggregatorV3Interface(_base).latestRoundData();
        uint8 baseDecimals = AggregatorV3Interface(_base).decimals();
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);

        ( , int256 quotePrice, , , ) = AggregatorV3Interface(_quote).latestRoundData();
        uint8 quoteDecimals = AggregatorV3Interface(_quote).decimals();
        quotePrice = scalePrice(quotePrice, quoteDecimals, _decimals);

        return basePrice * decimals / quotePrice;
    }

    function scalePrice(int256 _price, uint8 _priceDecimals, uint8 _decimals)
        internal
        pure
        virtual
        returns (int256)
    {
        if (_priceDecimals < _decimals) {
            return _price * int256(10 ** uint256(_decimals - _priceDecimals));
        } else if (_priceDecimals > _decimals) {
            return _price / int256(10 ** uint256(_priceDecimals - _decimals));
        }
        return _price;
    }

    function baseCurrencyDecimals() public view virtual returns (uint8) {
        if (baseCurrency() == Denominations.ETH) return 18;
        try IERC20Metadata(baseCurrency()).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    function canResolvePrice(address asset) public view virtual returns (bool) {
        if (asset == Denominations.ETH || asset == _WETH9())
            return true;
        try FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(asset, Denominations.ETH) {
            return true;
        } catch (bytes memory /*lowLevelData*/) {
            return false;
        }
    }

    uint256[50] private __gap;
}