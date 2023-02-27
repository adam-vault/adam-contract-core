// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";

import "./base/PriceGateway.sol";
import "./lib/Constant.sol";

contract EthereumChainlinkPriceGateway is PriceGateway {
    /// @custom:oz-upgrades-unsafe-allow constructor
    string public constant override name = "Ethereum Chainlink Price Gateway";

    error StaleRoundId(uint80 roundID, uint80 answeredInRound);
    error StaleTimestamp(uint256 currentTimeStamp, uint256 updatedAtTimeStamp);
    error InvaildDecimal(uint8 decimals);
    constructor() {
    }

    /// @notice inherited from PriceGateway, help to check the imported pair support or not
    /// @dev Custom price gateway is allowed, but need to implement priceGateway.sol and set by govern
    /// @param asset the asset token address, support ETH , WETH and other ERC20
    /// @param base the base token address, support ETH , WETH and other ERC20
    /// @return boolean Is support or not
    function isSupportedPair(address asset, address base)
        public
        virtual
        view
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
    ) public virtual view override returns (uint256) {
        if (asset == base) return amount;

        if (base == _NATIVE_TOKEN() || base == _WRAP_NATIVE_TOKEN()) {
            return assetEthPrice(asset, amount);
        }

        if (asset == _NATIVE_TOKEN() || asset == _WRAP_NATIVE_TOKEN()) {
            return ethAssetPrice(base, amount);
        }

        return derivedAssetPrice(asset, base, amount);
    }

    function assetEthPrice(address asset, uint256 amount)
        public
        view
        virtual
        returns (uint256)
    {
        if (asset == _NATIVE_TOKEN() || asset == _WRAP_NATIVE_TOKEN()) return amount;

        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                asset,
                _NATIVE_TOKEN()
            );
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(asset, _NATIVE_TOKEN());

        if (answeredInRound < roundID) {
            revert StaleRoundId(roundID, answeredInRound);
        }
        if (block.timestamp > updatedAt + Constant.STALE_PRICE_DELAY) {
            revert StaleTimestamp(block.timestamp, updatedAt);
        }

        price = scalePrice(
            price,
            priceDecimals,
            18 /* ETH decimals */
        );

        if (price > 0) {
            return
                (uint256(price) * amount) /
                10**IERC20Metadata(asset).decimals();
        }

        return 0;
    }

    function ethAssetPrice(address asset, uint256 ethAmount)
        public
        view
        virtual
        returns (uint256)
    {
        if (asset == _NATIVE_TOKEN() || asset == _WRAP_NATIVE_TOKEN()) return ethAmount;

        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                asset,
                _NATIVE_TOKEN()
            );
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(asset, _NATIVE_TOKEN());

        if (answeredInRound < roundID) {
            revert StaleRoundId(roundID, answeredInRound);
        }
        if (block.timestamp > updatedAt + Constant.STALE_PRICE_DELAY) {
            revert StaleTimestamp(block.timestamp, updatedAt);
        }
        price = scalePrice(
            price,
            priceDecimals,
            18 /* ETH decimals */
        );
        if (price > 0) {
            return
                (ethAmount * (10**IERC20Metadata(asset).decimals())) /
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
        if (_decimals <= uint8(0) || _decimals > uint8(18)) {
            revert InvaildDecimal(_decimals);
        }
        int256 decimals = int256(10**uint256(_decimals));
        (
            uint80 _baseRoundID,
            int256 basePrice,
            ,
            uint256 _baseUpdatedAt,
            uint80 _baseAnsweredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                _base,
                _NATIVE_TOKEN()
            );

        if (_baseAnsweredInRound < _baseRoundID) {
            revert StaleRoundId(_baseRoundID, _baseAnsweredInRound);
        }
        if (block.timestamp > _baseUpdatedAt + Constant.STALE_PRICE_DELAY) {
            revert StaleTimestamp(block.timestamp, _baseUpdatedAt);
        }

        uint8 baseDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(_base, _NATIVE_TOKEN());
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);
        (
            uint80 _quoteRoundID,
            int256 quotePrice,
            ,
            uint256 _quoteUpdatedAt,
            uint80 _quoteAnsweredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                _quote,
                _NATIVE_TOKEN()
            );
        if (_quoteAnsweredInRound < _quoteRoundID) {
            revert StaleRoundId(_quoteRoundID, _quoteAnsweredInRound);
        }
        if (block.timestamp > _quoteUpdatedAt + Constant.STALE_PRICE_DELAY) {
            revert StaleTimestamp(block.timestamp, _quoteUpdatedAt);
        }

        uint8 quoteDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(_quote, _NATIVE_TOKEN());
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
        if (asset == _NATIVE_TOKEN() || asset == _WRAP_NATIVE_TOKEN()) return true;
        try
            FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(
                asset,
                _NATIVE_TOKEN()
            )
        {
            return true;
        } catch (bytes memory) {
            return false;
        }
    }

    function assetDecimals(address asset) public view virtual returns (uint8) {
        if (asset == _NATIVE_TOKEN()) return 18;
        try IERC20Metadata(asset).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    function _WRAP_NATIVE_TOKEN() internal pure returns (address) {
        return Constant.WRAP_NATIVE_TOKEN;
    }

    function _NATIVE_TOKEN() internal pure returns (address) {
        return Constant.NATIVE_TOKEN;
    }
}