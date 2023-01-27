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

        if (base == Denominations.ETH || base == _WETH9()) {
            return assetEthPrice(asset, amount);
        }

        if (asset == Denominations.ETH || asset == _WETH9()) {
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
        if (asset == Denominations.ETH || asset == _WETH9()) return amount;

        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                asset,
                Denominations.ETH
            );
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(asset, Denominations.ETH);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(
            block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY,
            "Stale price in Chainlink 113"
        );

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
        if (asset == Denominations.ETH || asset == _WETH9()) return ethAmount;

        (
            uint80 roundID,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                asset,
                Denominations.ETH
            );
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY)
            .decimals(asset, Denominations.ETH);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(
            block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY,
            "Stale price in Chainlink 113"
        );

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
                Denominations.ETH
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
            .decimals(_base, Denominations.ETH);
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);
        (
            uint80 _quoteRoundID,
            int256 quotePrice,
            ,
            uint256 _quoteUpdatedAt,
            uint80 _quoteAnsweredInRound
        ) = FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(
                _quote,
                Denominations.ETH
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
            .decimals(_quote, Denominations.ETH);
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
        if (asset == Denominations.ETH || asset == _WETH9()) return true;
        try
            FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(
                asset,
                Denominations.ETH
            )
        {
            return true;
        } catch (bytes memory) {
            return false;
        }
    }

    function assetDecimals(address asset) public view virtual returns (uint8) {
        if (asset == Denominations.ETH) return 18;
        try IERC20Metadata(asset).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    function _WETH9() internal pure returns (address) {
        return Constant.WETH_ADDRESS;
    }
}