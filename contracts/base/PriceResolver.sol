// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/Constant.sol";
import "../interface/IPriceRouter.sol";

contract PriceResolver is Initializable {
    address private _baseCurrency;

    //v2
    IPriceRouter private _priceRouter;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function __PriceResolver_init(address __priceRouter, address __baseCurrency) internal onlyInitializing {
        _priceRouter = IPriceRouter(__priceRouter);
        _baseCurrency = __baseCurrency;
}

    modifier priceRouterExist {
        require(address(_priceRouter) != address(0), "Price router not Exist");
        _;
    }

    function baseCurrency() public view virtual priceRouterExist returns (address) {
        return _baseCurrency;
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function assetBaseCurrencyPrice(address asset, uint256 amount) public view virtual priceRouterExist returns (uint256) {
        return _priceRouter.assetBaseCurrencyPrice(asset, amount, _baseCurrency);
    }

    function ethAssetPrice(address asset, uint256 ethAmount) public view virtual priceRouterExist returns (uint256) {
        return _priceRouter.ethAssetPrice(asset, ethAmount);
    }

    function assetEthPrice(address asset, uint256 amount) public view virtual priceRouterExist returns (uint256) {
        return _priceRouter.assetEthPrice(asset, amount);
    }

    function baseCurrencyDecimals() public view virtual priceRouterExist returns (uint8) {
        return _priceRouter.baseCurrencyDecimals(_baseCurrency);
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function canResolvePrice(address asset) public view virtual priceRouterExist returns (bool) {
        return _priceRouter.canResolvePrice(asset);
    }

    uint256[49] private __gap;
}