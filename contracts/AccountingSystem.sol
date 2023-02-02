// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./base/PriceGateway.sol";
import "./lib/Concat.sol";
import "./interface/IPriceGateway.sol";
import "./interface/IDao.sol";

/// @title Dao Account System
/// @notice This contract helps managing price gateway and allow set price by govern
/// @dev The contract is interacted with priceResolver.sol
/// @dev Custom price gateway is allowed, but need to implement priceGateway.sol and set by govern
/// @dev AccountingSystem implemented price gateway since it will handle set price by govern

contract AccountingSystem is Initializable, OwnableUpgradeable {
    using Concat for string;
    address public defaultPriceGateway;

    mapping(address => bool) public priceGateways;
    mapping(address => mapping(address => address))
        public tokenPairPriceGatewayMap;

    event AddPriceGateway(address priceGateway);
    error PriceGatewayExist(address priceGateway);
    error PriceGatewayOmit(address priceGateway);
    error InputLengthNotMatch(uint count1, uint count2);
    error PairNotSupport(address asset, address base);
    error OwnerNotPermit(address priceGateway);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address[] memory _priceGateways
    )
        public
        initializer
    {   
        __Ownable_init();

        for (uint256 i = 0; i < _priceGateways.length; i++) {
            if(i == 0) {
                defaultPriceGateway = _priceGateways[i];
            }
            addPriceGateway(_priceGateways[i]);

        }
    }

    /// @notice Add the price gateway to whitelist
    /// @dev This function must be called by govern, will logic occur in internal function
    /// @param priceGateway price Gateway address that want to whitelist
    function addPriceGateway(address priceGateway)
        public
        onlyOwner
    {
        _addPriceGateway(priceGateway);
    }
    /// @notice Internal function add the price gateway to whitelist
    /// @dev Same price gateway cannot add to whitelist twice
    /// @param priceGateway price Gateway address that want to whitelist
    function _addPriceGateway(address priceGateway) internal {
        if (!IDao(payable(owner())).canAddPriceGateway(priceGateway)) {
            revert OwnerNotPermit(priceGateway);
        }
        if(priceGateways[priceGateway]){
            revert PriceGatewayExist(priceGateway);
        }
        priceGateways[priceGateway] = true;

        emit AddPriceGateway(priceGateway);
    }

    /// @notice Set the price gateway which will handle the pairs of price
    /// @dev This function must be called by govern, will logic occur in internal function
    /// @param _assets Asset List that supported by price gateway
    /// @param _bases Base token List that supported by price gateway
    /// @param priceGateway Price gateway address
    function setTokenPairPriceGatewayMap(
        address[] calldata _assets,
        address[] calldata _bases,
        address priceGateway
    ) public onlyOwner {
        _setTokenPairPriceGatewayMap(_assets, _bases, priceGateway);
    }

    /// @notice Internal function that set which price gateway will handle which pair of price
    /// @dev The Price gateway need to support all combination of asset x base
    /// @param _assets Asset address List that supported by price gateway
    /// @param _bases Base token address List that supported by price gateway
    /// @param priceGateway Price gateway address
    function _setTokenPairPriceGatewayMap(
        address[] calldata _assets,
        address[] calldata _bases,
        address priceGateway
    ) internal {
        if (!priceGateways[priceGateway]) {
            revert PriceGatewayOmit(priceGateway);
        }
        if (_assets.length != _bases.length) {
            revert InputLengthNotMatch(_assets.length, _bases.length);
        }
        for (uint256 i = 0; i < _assets.length; i++) {
            if (!IPriceGateway(priceGateway).isSupportedPair(_assets[i], _bases[i])) {
                revert PairNotSupport(_assets[i], _bases[i]);
            }
            tokenPairPriceGatewayMap[_assets[i]][_bases[i]] = priceGateway;
        }
    }

    /// @notice Provide Asset Price
    /// @dev accept ETH / USD as Asset / Base Token
    /// @param asset Asset token address
    /// @param base Base token address
    /// @param amount Asset Amount in term of Asset decimal
    function assetPrice(
        address asset,
        address base,
        uint256 amount
    ) public view returns (uint256) {
        if (asset == base && asset != address(0)) return amount;

        if(!isSupportedPair(asset, base)){
            revert PairNotSupport(asset, base);
        }

        address _priceGateway = (tokenPairPriceGatewayMap[asset][base] != address(0)) ? tokenPairPriceGatewayMap[asset][base] : defaultPriceGateway;
        return IPriceGateway(_priceGateway).assetPrice(asset, base, amount);
    }

    /// @notice Check the token pair is support or not
    /// @dev This function not really check in gateway,
    /// @dev since the checking will be done when setting tokenPairPriceGatewayMap
    /// @param asset Asset token address
    /// @param base Base token address
    /// @return Bool Result of the checking
    function isSupportedPair(address asset, address base)
        public
        view
        returns (bool)
    {        

        if (asset == base && asset != address(0)) return true;
        return 
            tokenPairPriceGatewayMap[asset][base] != address(0) ||
            IPriceGateway(defaultPriceGateway).isSupportedPair(asset, base);
    }

    uint256[50] private __gap;
}