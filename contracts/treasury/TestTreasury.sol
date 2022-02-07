// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../lib/DSMath.sol";
import "./PriceConverter.sol";
import "../interface/IAdam.sol";
import "../interface/IManageable.sol";
import "../interface/ITreasury.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '../base/AdamOwned.sol';
import "hardhat/console.sol";

contract TestTreasury is Context, ERC20, AdamOwned, ITreasury {
    using DSMath for uint256;

    string[] public basketCoins;
    mapping(string => uint256) public basket;
    mapping(string => AggregatorV3Interface) public priceFeed;

    IPriceConverter private _priceConverter;
    address private _owner;

    event ExchangeEve(int256 coinPrice, string tokenName, uint256 quatityToExchange, int256 perEVE);
    event PreExchangeEve(int256 coinPrice, string tokenName, uint256 quatityToExchange);

    constructor(address adam, address priceConverter) ERC20("Eve", "EVE") {
        setAdam(adam);
        IAdam(adam).setTreasury(address(this));
        _priceConverter = IPriceConverter(priceConverter);
        _owner = _msgSender();

        basketCoins = ["ETH"];

        // value would need to div by 10**4
        basket["ETH"] = 10000;

        /**
            provided by chainlink
            REMARK: ETH qoute = 18 decimals, USD quote = 8 decimals
        */

        //kovan
        priceFeed["ETH/USD"] = AggregatorV3Interface(0x9326BFA02ADD2366b30bacB125260Af641031331);
    }

    function getXUsdPrice(string memory coin) public pure returns (int256) {
        if (
            keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("ETH"))
        ) {
            return 307000000000;
        }

        return 0;
    }

    function getEVEPrice() public view returns (uint256) {
        uint256 evePrice = 0;
        for (uint256 i = 0; i < basketCoins.length; i++) {
            string memory coin = basketCoins[i];
            uint256 takeUpRatio = uint256(basket[coin]).wdiv(10**4);
            int256 coinPrice = getXUsdPrice(coin);
            uint256 temp = uint256(coinPrice).wmul(takeUpRatio);

            evePrice = evePrice.add(temp);
        }

        return evePrice;
    }

    function exchangeEVE(address to, address token, uint256 quantity) external payable onlyAssetManager override returns (int256) {
        address from = _msgSender();

        string memory tokenSymbol = "";
        if (msg.value != 0) {
            tokenSymbol = "ETH";
            quantity = msg.value;
        } else {
            tokenSymbol = ERC20(token).symbol();
        }

        int256 evePrice = int256(getEVEPrice());
        int256 coinPrice = getXUsdPrice(tokenSymbol);

        emit PreExchangeEve(coinPrice, tokenSymbol, quantity);

        //UNKNOW / USD / EDT / USD ==> UNKNOW / EDT
        int256 perEVE = _priceConverter.getDerivedPrice(
            coinPrice,
            8,
            evePrice,
            8,
            18
        );
        
        emit ExchangeEve(coinPrice, tokenSymbol, quantity, perEVE);

        uint256 amount = uint256(perEVE) * quantity / (10 ** 18);

        if (keccak256(abi.encodePacked(tokenSymbol)) != keccak256(abi.encodePacked("ETH"))) {
            ERC20(token).transferFrom(from, address(this), quantity);
        }

        _mint(to, amount);

        return int(amount);
    }

    fallback() external payable {}
    receive() external payable {}
}
