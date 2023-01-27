// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../interface/IAccountingSystem.sol";
import "../lib/Constant.sol";

abstract contract PriceResolver {
    function baseCurrency() public view virtual returns (address);
    function accountingSystem() public view virtual returns (address);

    /// @notice This function is imported by other contract, thus cannot be external
    function assetBaseCurrencyPrice(address asset, uint256 amount) public  view virtual returns (uint256) {
        address _baseCurrency = baseCurrency();
        address _accountingSystem = accountingSystem();

        require(IAccountSystem(_accountingSystem).isSupportedPair(asset,_baseCurrency), 'Account System not supported');
        return IAccountSystem(_accountingSystem).assetPrice(asset, _baseCurrency, amount);
    }

    function assetPrice(address asset, address base, uint256 amount) public  view virtual returns (uint256) {
        address _accountingSystem = accountingSystem();
        require(IAccountSystem(_accountingSystem).isSupportedPair(asset, base), 'Account System not supported');
        return IAccountSystem(_accountingSystem).assetPrice(asset, base, amount);
    }

    function baseCurrencyDecimals() public view virtual returns (uint8) {
        address _baseCurrency = baseCurrency();
        if (_baseCurrency == Denominations.ETH) return 18;
        try IERC20Metadata(_baseCurrency).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }

    /// @notice This function is imported by other contract, thus cannot be external
    function canResolvePrice(address asset) public view virtual returns (bool) {
       return IAccountSystem(accountingSystem()).isSupportedPair(asset, baseCurrency());
    }
}