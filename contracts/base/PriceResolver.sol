// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interface/IAccountSystem.sol";
import "../lib/Constant.sol";

contract PriceResolver is Initializable {
    address private _baseCurrency;
    
    // V2
    address private _accountSystem;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function __PriceResolver_init(
        address __baseCurrency,
        address __accountSystem
    ) internal onlyInitializing {
        _baseCurrency = __baseCurrency;
        _accountSystem = __accountSystem;
    }

    function baseCurrency() public view virtual returns (address) {
        return _baseCurrency;
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function assetBaseCurrencyPrice(address asset, uint256 amount) public  view virtual returns (uint256) {
        require(IAccountSystem(_accountSystem).isSupportedPair(asset,_baseCurrency),'Account System not supported');
        return IAccountSystem(_accountSystem).assetPrice(asset, _baseCurrency, amount);
    }

    function assetPrice(address asset, address base, uint256 amount) public  view virtual returns (uint256) {
        require(IAccountSystem(_accountSystem).isSupportedPair(asset, base),'Account System not supported');
        return IAccountSystem(_accountSystem).assetPrice(asset, base, amount);
    }

    function baseCurrencyDecimals() public view virtual returns (uint8) {
        if (baseCurrency() == Denominations.ETH) return 18;
        try IERC20Metadata(baseCurrency()).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function canResolvePrice(address asset) public view virtual returns (bool) {
       return IAccountSystem(_accountSystem).isSupportedPair(asset,_baseCurrency);
    }

    uint256[50] private __gap;
}