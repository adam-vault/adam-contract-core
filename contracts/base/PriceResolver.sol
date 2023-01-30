// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "../interface/IAccountSystem.sol";
import "../lib/Constant.sol";

abstract contract PriceResolver {

    address private _baseCurrency;
    
    // V2
    address private _accountSystem;

    error PairNotSupport(address asset, address base);

    function baseCurrency() public view virtual returns (address);
    function accountSystem() public view virtual returns (address);


    /// @notice This function is imported by other contract, thus cannot be external
    function assetBaseCurrencyPrice(address asset, uint256 amount) public  view virtual returns (uint256) {
        if(!IAccountSystem(accountSystem()).isSupportedPair(asset, baseCurrency())){
            revert PairNotSupport(asset, baseCurrency());
        }
        return IAccountSystem(accountSystem()).assetPrice(asset, baseCurrency(), amount);
    }

    function assetPrice(address asset, address base, uint256 amount) public  view virtual returns (uint256) {
        if(!IAccountSystem(accountSystem()).isSupportedPair(asset, base)){
            revert PairNotSupport(asset, base);
        }
        return IAccountSystem(accountSystem()).assetPrice(asset, base, amount);
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
       return IAccountSystem(accountSystem()).isSupportedPair(asset, baseCurrency());
    }

    uint256[50] private __gap;
}