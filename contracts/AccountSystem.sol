// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./base/PriceGateway.sol";
import "./lib/Concat.sol";

import "./interface/IDao.sol";
import "./interface/IPriceGateway.sol";

/// @title Dao Account System
/// @notice This contract helps managing price gateway and allow set price by govern
/// @dev The contract is interacted with priceResolver.sol
/// @dev Custom price gateway is allowed, but need to implement priceGateway.sol and set by govern
/// @dev AccountSystem implemented price gateway since it will handle set price by govern

contract AccountSystem is Initializable, UUPSUpgradeable {
    using Concat for string;
    bool private _initializing;
    IDao public dao;
    address public defaultPriceGateway;

    mapping(address => bool) public priceGateways;
    mapping(address => mapping(address => address))
        public tokenPairPriceGatewayMap;

    event AddPriceGateway(address priceGateway);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner, 
        address[] memory _priceGateways
    )
        public
        initializer
    {   
        _initializing = true;
        dao = IDao(payable(owner));

        for (uint256 i = 0; i < _priceGateways.length; i++) {
            if(i == 0) {
                defaultPriceGateway = _priceGateways[i];
            }
            addPriceGateway(_priceGateways[i]);

        }
        _initializing = false;
    }

    /// @notice Add the price gateway to whitelist
    /// @dev This function must be called by govern, will logic occur in internal function
    /// @param priceGateway price Gateway address that want to whitelist
    function addPriceGateway(address priceGateway)
        public
        onlyGovern("General")
    {
        _addPriceGateway(priceGateway);
    }
    /// @notice Internal function add the price gateway to whitelist
    /// @dev Same price gateway cannot add to whitelist twice
    /// @param priceGateway price Gateway address that want to whitelist
    function _addPriceGateway(address priceGateway) internal {
        require(
            !priceGateways[priceGateway],
            "Price Gateway Already whitelisted"
        );
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
    ) public onlyGovern("General") {
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
        require(priceGateways[priceGateway], "PriceGateway Not whitelisted");
        for (uint256 i = 0; i < _assets.length; i++) {
            for (uint256 j = 0; j < _bases.length; i++) {
                require(
                    IPriceGateway(priceGateway).isSupportedPair(
                        _assets[i],
                        _bases[j]
                    ),
                    "Price Pair not supported by price gateway"
                );

                tokenPairPriceGatewayMap[_assets[i]][_bases[i]] = priceGateway;
            }
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
        require(isSupportedPair(asset, base), "Not Supported Price Pair");
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
        return 
            tokenPairPriceGatewayMap[asset][base] != address(0) ||
            IPriceGateway(defaultPriceGateway).isSupportedPair(asset, base);
    }

    /// @notice Modilifier that allow init and govern to execute function
    /// @dev Don't check initializing at same require, since for accountSystem init before Dao
    /// @dev So for those initializing case, Dao related function cannot be call
    /// @param category govern Category
    modifier onlyGovern(string memory category) {
        IDao _dao = dao;
        
        if(!_initializing){
            require(
                (_dao.byPassGovern(msg.sender)) ||
                    msg.sender == _dao.govern(category),
                string("Dao: only Govern").concat(category)
            );
        }
        _;
    }

    function _authorizeUpgrade(address)
        internal
        view
        override
        onlyGovern("General")
    {}

    uint256[50] private __gap;
}
