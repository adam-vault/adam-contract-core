// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./lib/Constant.sol";
import "./lib/Concat.sol";
import "./interface/IDao.sol";
import "hardhat/console.sol";

contract PriceRouter is Initializable, UUPSUpgradeable{
    using Concat for string;
    IDao public dao;
    mapping(address => mapping(address => int)) private markedPrice;        // in 18 decimal
    mapping(address => mapping(address => bool)) private isAssetSupported;

    event MarkedPriceSet(address asset, address baseCurrency, int price);

    modifier onlyDao() {
        require(msg.sender == address(dao), "not dao");
        _;
    }

    modifier onlyGovern(string memory category) {
        IDao _dao = dao;
        require(
            (_dao.byPassGovern(msg.sender)) || msg.sender == _dao.govern(category),
            string("Dao: only Govern").concat(category));
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(address _dao) external initializer{
        dao = IDao(payable(_dao));
    }

    function _WETH9() internal pure returns (address) {
        return Constant.WETH_ADDRESS;
    }

    function setMarkedPrice(address asset, address baseCurrency, int price) external onlyGovern("General") {
        markedPrice[asset][baseCurrency] = price;
        isAssetSupported[asset][baseCurrency] = true;
        emit MarkedPriceSet(asset, baseCurrency, price);
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function assetBaseCurrencyPrice(address asset, uint256 amount, address baseCurrency) public view virtual returns (uint256) {
   
        if (asset == baseCurrency){
            return amount;
        }
        if (isAssetSupported[asset][baseCurrency]){
            return scaleAmount(asset, baseCurrency, markedPrice[asset][baseCurrency], amount);
        }
        if(baseCurrency == Denominations.ETH || baseCurrency == _WETH9()) {
            return assetEthPrice(asset, amount);
        }

        if(asset == Denominations.ETH || asset == _WETH9()) {
            return ethAssetPrice(baseCurrency, amount);
        }
        return scaleAmount(asset, baseCurrency, getDerivedPrice(asset, baseCurrency, 18 /* ETH decimals */), amount);
    }

    function ethAssetPrice(address asset, uint256 ethAmount) public view virtual returns (uint256) {
        if (asset == Denominations.ETH || asset == _WETH9())
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

        if (asset == Denominations.ETH || asset == _WETH9())
            return amount;

        (uint80 roundID, int price, , uint256 updatedAt, uint80 answeredInRound) = 
        FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(asset, Denominations.ETH);
        uint8 priceDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY).decimals(asset, Denominations.ETH);

        require(answeredInRound >= roundID, "Stale price in Chainlink");
        require(block.timestamp <= updatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink");
  
        price = scalePrice(price, priceDecimals, 18 /* ETH decimals */);

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
            FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(_base, Denominations.ETH);

        require(_baseAnsweredInRound >= _baseRoundID, "Stale price in Chainlink 104");
        require(block.timestamp <= _baseUpdatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink 105");

        uint8 baseDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY).decimals(_base, Denominations.ETH);
        basePrice = scalePrice(basePrice, baseDecimals, _decimals);
        (uint80 _quoteRoundID, int quotePrice, , uint256 _quoteUpdatedAt, uint80 _quoteAnsweredInRound) = 
            FeedRegistryInterface(Constant.FEED_REGISTRY).latestRoundData(_quote, Denominations.ETH);
        require(_quoteAnsweredInRound >= _quoteRoundID, "Stale price in Chainlink 112");
        require(block.timestamp <= _quoteUpdatedAt + Constant.STALE_PRICE_DELAY, "Stale price in Chainlink 113");

        uint8 quoteDecimals = FeedRegistryInterface(Constant.FEED_REGISTRY).decimals(_quote, Denominations.ETH);
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

    function scaleAmount(address asset, address baseCurrency, int price, uint256 amount) internal view returns(uint256){
        uint8 baseDecimals = assetDecimals(baseCurrency);

        if (price > 0) {
            return uint256(scalePrice(int256(price) * int256(amount), 18 + IERC20Metadata(asset).decimals(), baseDecimals));
        }
        return 0;
    }

    function assetDecimals(address asset) public  view virtual returns (uint8) {
        if (asset == Denominations.ETH) return 18;
        try IERC20Metadata(asset).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function canResolvePrice(address asset, address baseCurrency) public view virtual returns (bool) {

        if (isAssetSupported[asset][baseCurrency] || asset == baseCurrency){ // if asset = baseCurrency return true
            return true;
        }

        bool isETHAsset = (asset == Denominations.ETH || asset == _WETH9());
        bool isETHBaseCurrency = (baseCurrency == Denominations.ETH || baseCurrency == _WETH9());

        if(isETHAsset && isETHBaseCurrency){ // asset= ETH and baseCurrency = ETH
            return true;
        }

        bool isSupportedAsset = isFeedRegistrySupported(asset);
        if(isSupportedAsset && isETHBaseCurrency){ // asset = ETH and baseCurrency can get feed
            return true;
        }

        bool isSupportedBaseCurrency = isFeedRegistrySupported(baseCurrency);
        if(isSupportedBaseCurrency && isETHAsset){ // baseCurrency = ETH and asset can get feed
            return true;
        }
        return isSupportedAsset && isSupportedBaseCurrency; // both asset and baseCurrency can get feed
    }

    function isFeedRegistrySupported(address asset) internal view returns (bool){
        try FeedRegistryInterface(Constant.FEED_REGISTRY).getFeed(asset, Denominations.ETH) {
            return true;
        } catch (bytes memory) {
            return false;
        }
    }

    function _authorizeUpgrade(address) internal view override onlyDao {}

    uint256[50] private __gap;
}