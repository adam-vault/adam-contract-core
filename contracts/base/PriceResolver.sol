// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../lib/Constant.sol";
import "hardhat/console.sol";

contract PriceResolver is Initializable {
    address private _baseCurrency;

    function __PriceResolver_init(address __baseCurrency) internal onlyInitializing {
        _baseCurrency = __baseCurrency;
    }

    function baseCurrency() public view virtual returns (address) {
        return _baseCurrency;
    }

    function assetBaseCurrencyPrice(address asset, uint256 amount) public view virtual returns (uint256) {
        address __baseCurrency = baseCurrency();
        if (asset == __baseCurrency)
            return amount;
        
        if(__baseCurrency == Denominations.ETH || __baseCurrency == Constant.WETH_ADDRESS) {
            return assetEthPrice(asset, amount);
        }

        if(asset == Denominations.ETH || asset == Constant.WETH_ADDRESS) {
            return ethAssetPrice(__baseCurrency, amount);
        }

        address baseCurrencyETHFeed = address(FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(__baseCurrency, Denominations.ETH));
        address assetETHFeed = address(FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(asset, Denominations.ETH));
        uint8 baseDecimals = baseCurrencyDecimals();
        int price = getDerivedPrice(assetETHFeed, baseCurrencyETHFeed, 18 /* ETH decimals */);

        if (price > 0) {
            return uint256(scalePrice(int256(price) * int256(amount), 18 + IERC20Metadata(asset).decimals(), baseDecimals));
        }
        return 0;
    }

    function ethAssetPrice(address asset, uint256 ethAmount) public view virtual returns (uint256) {
        if (asset == Denominations.ETH || asset == Constant.WETH_ADDRESS)
            return ethAmount;

        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = 
        FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(asset, Denominations.ETH);
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY).decimals(asset, Denominations.ETH);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink");

        price = scalePrice(price, priceDecimals, 18 /* ETH decimals */);
        if (price > 0) {
            return ethAmount * (10 ** IERC20Metadata(asset).decimals()) / uint256(price);
        }

        return 0;
    }

    function assetEthPrice(address asset, uint256 amount) public view virtual returns (uint256) {
        if (asset == Denominations.ETH || asset == Constant.WETH_ADDRESS)
            return amount;

        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = 
        FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(asset, Denominations.ETH);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink");

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
        (uint80 _baseRoundID, int basePrice, , uint256 _baseUpdatedAt, uint80 _baseAnsweredInRound) = 
        AggregatorV3Interface(_base).latestRoundData();

        require(_baseAnsweredInRound >= _baseRoundID, "Stale price in Chainlink");
        require(block.timestamp <= _baseUpdatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink");

        uint8 baseDecimals = AggregatorV3Interface(_base).decimals();
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);
        (uint80 _quoteRoundID, int quotePrice, , uint256 _quoteUpdatedAt, uint80 _quoteAnsweredInRound) = 
        AggregatorV3Interface(_quote).latestRoundData();

        require(_quoteAnsweredInRound >= _quoteRoundID, "Stale price in Chainlink");
        require(block.timestamp <= _quoteUpdatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink");

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
        if (asset == Denominations.ETH || asset == Constant.WETH_ADDRESS)
            return true;
        try FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(asset, Denominations.ETH) {
            return true;
        } catch (bytes memory /*lowLevelData*/) {
            return false;
        }
    }

    uint256[50] private __gap;
}