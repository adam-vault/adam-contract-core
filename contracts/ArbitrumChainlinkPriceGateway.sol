// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";

import "./base/PriceGateway.sol";
import "./lib/Constant.sol";

contract EthereumChainlinkPriceGateway is Initializable, PriceGateway {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice inherited from PriceGateway, help to check the imported pair support or not
    /// @dev Custom price gateway is allowed, but need to implement priceGateway.sol and set by govern
    /// @param asset the asset token address, support ETH , WETH and other ERC20
    /// @param base the base token address, support ETH , WETH and other ERC20
    /// @return boolean Is support or not
    function isSupportedPair(address asset, address base)
        public
        virtual
        override
        returns (bool)
    {
        return canResolvePrice(asset) && canResolvePrice(base);
    }

    /// @notice inherited from PriceGateway, to cal the asset price base on different token
    /// @dev For those outside contract , Please used this as the entry point
    /// @dev this Function will help to route the calculate to other cal function,
    /// @dev Please do not directly call the below cal function
    /// @param asset the asset token address, support ETH , WETH and other ERC20
    /// @param base the base token address, support ETH , WETH and other ERC20
    /// @param amount the amount of asset, in asset decimal
    /// @return uint256 the Asset Price in term of base token in base token decimal
    function assetPrice(
        address asset,
        address base,
        uint256 amount
    ) public virtual override returns (uint256) {
        asset = asset == _WETH9() ? Denominations.ETH : asset;
        base = base == _WETH9() ? Denominations.ETH : base;
        // Feed Registry doesn't provide any WETH Price Feed, redirect to ETH case here

        if (asset == base) return amount;

        if (base == Denominations.USD) {
            return assetUSDPrice(asset, amount);
        }

        if (asset == Denominations.USD) {
            return usdAssetPrice(base, amount);
        }

        return derivedAssetPrice(asset, base, amount);
    }

    /// @notice Get Asset Price in Term of USD
    /// @dev Get the rate in Chainlink and scale the Price to decimal 8
    /// @param asset the asset token address, support ETH , WETH and other ERC20
    /// @param amount Asset Amount in term of asset's decimal
    /// @return uint256 the Asset Price in term of USD with hardcoded decimal 8
    function assetUSDPrice(address asset, uint256 amount)
        internal
        view
        virtual
        returns (uint256)
    {
        if (asset == Denominations.USD) return amount;

        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                asset,
                Denominations.USD
            );
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(asset, Denominations.USD);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(
            block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY,
            "Stale price in Chainlink"
        );

        price = scalePrice(
            price,
            priceDecimals,
            8 /* USD decimals */
        );

        if (price > 0) {
            // return price with decimal = price Decimal (8) + amount decimal (Asset decimal) - Asset decimal = price decimal(8)
            return
                (uint256(price) * amount) /
                10**IERC20Metadata(asset).decimals();
        }

        return 0;
    }

    /// @notice Get USD Price in term of Asset
    /// @dev Get the rate in Chainlink and scale the Price to asset decimal
    /// @param asset the asset token address, support ETH , WETH and other ERC20, used as base token address
    /// @param usdAmount Usd Amount with 8 decimal (arbitrum)
    /// @return uint256 the price by using asset as base with assets decimal
    function usdAssetPrice(address asset, uint256 usdAmount)
        public
        view
        virtual
        returns (uint256)
    {
        if (asset == Denominations.USD) return usdAmount;

        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                asset,
                Denominations.USD
            );
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(asset, Denominations.USD);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(
            block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY,
            "Stale price in Chainlink"
        );

        price = scalePrice(
            price,
            priceDecimals,
            8 /* USD decimals */
        );
        if (price > 0) {
            // return price with decimal = 8 + asset Decimal - price Decimal (8) = asset Decimal
            return
                (usdAmount * (10**IERC20Metadata(asset).decimals())) /
                uint256(price);
        }

        return 0;
    }

    function derivedAssetPrice(
        address asset,
        address base,
        uint256 amount
    ) public view virtual returns (uint256) {
        int256 rate = getDerivedPrice(
            asset,
            base,
            18 /* ETH decimals */
        );

        if (rate > 0) {
            return
                uint256(
                    scalePrice(
                        int256(rate) * int256(amount),
                        18 + assetDecimals(asset),
                        assetDecimals(base)
                    )
                );
        }
        return 0;
    }

    function getDerivedPrice(
        address _base,
        address _quote,
        uint8 _decimals
    ) internal view virtual returns (int256) {
        require(
            _decimals > uint8(0) && _decimals <= uint8(18),
            "Invalid _decimals"
        );
        int256 decimals = int256(10**uint256(_decimals));
        (
            uint80 _baseRoundID,
            int256 basePrice,
            ,
            uint256 _baseUpdatedAt,
            uint80 _baseAnsweredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                _base,
                Denominations.USD
            );

        require(
            _baseAnsweredInRound >= _baseRoundID,
            "Stale price in Chainlink 104"
        );
        require(
            block.timestamp <= _baseUpdatedAt + Constant.STALE_PRICE_DELAY,
            "Stale price in Chainlink 105"
        );

        uint8 baseDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(_base, Denominations.USD);
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);
        (
            uint80 _quoteRoundID,
            int256 quotePrice,
            ,
            uint256 _quoteUpdatedAt,
            uint80 _quoteAnsweredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                _quote,
                Denominations.USD
            );
        require(
            _quoteAnsweredInRound >= _quoteRoundID,
            "Stale price in Chainlink 112"
        );
        require(
            block.timestamp <= _quoteUpdatedAt + Constant.STALE_PRICE_DELAY,
            "Stale price in Chainlink 113"
        );

        uint8 quoteDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(_quote, Denominations.USD);
        quotePrice = scalePrice(quotePrice, quoteDecimals, _decimals);

        return (basePrice * decimals) / quotePrice;
    }

    function scalePrice(
        int256 _price,
        uint8 _priceDecimals,
        uint8 _decimals
    ) internal pure virtual returns (int256) {
        if (_priceDecimals < _decimals) {
            return _price * int256(10**uint256(_decimals - _priceDecimals));
        } else if (_priceDecimals > _decimals) {
            return _price / int256(10**uint256(_priceDecimals - _decimals));
        }
        return _price;
    }

    function canResolvePrice(address asset) internal view returns (bool) {
        if (asset == Denominations.USD) return true;

        if (asset == _WETH9()) {
            // Feed Registry doesn't provide any WETH Price Feed, redirect to ETH case here
            asset = Denominations.ETH;
        }

        try
            FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(
                asset,
                Denominations.USD
            )
        {
            return true;
        } catch (bytes memory) {
            return false;
        }
    }

    function assetDecimals(address asset) public view virtual returns (uint8) {
        if (asset == Denominations.ETH) return 18;
        if (asset == Denominations.USD) return 8;
        try IERC20Metadata(asset).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    function _WETH9() internal pure returns (address) {
        return Constant.WETH_ADDRESS;
    }

    uint256[50] private __gap;
}
