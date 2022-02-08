// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../lib/DSMath.sol";
import "./PriceConverter.sol";
import "../interface/IAdam.sol";
import "../interface/IManageable.sol";
import "../interface/ITreasury.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import '../base/AdamOwned.sol';
import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract Treasury is ERC20Upgradeable, AdamOwned, ITreasury {
    using DSMath for uint256;

    string[] public basketCoins;
    mapping(string => uint256) public basket;
    mapping(string => AggregatorV3Interface) public priceFeed;

    IPriceConverter private _priceConverter;
    address private _owner;

    event ExchangeEve(int256 coinPrice, string tokenName, uint256 quatityToExchange, int256 perEVE);
    event PreExchangeEve(int256 coinPrice, string tokenName, uint256 quatityToExchange);

    function initialize(address adam, address priceConverter) public initializer {
        __ERC20_init("Eve", "EVE");
        setAdam(adam);
        IAdam(adam).setTreasury(address(this));
        _priceConverter = IPriceConverter(priceConverter);
        _owner = _msgSender();

        basketCoins = ["BTC", "ETH", "BNB", "LINK"];

        // value would need to div by 10**4
        basket["BTC"] = 100;
        basket["ETH"] = 629;
        basket["BNB"] = 881;
        basket["LINK"] = 1894;

        /**
            provided by chainlink
            REMARK: ETH qoute = 18 decimals, USD quote = 8 decimals
        */

        //kovan
        priceFeed["BTC/USD"] = AggregatorV3Interface(0x6135b13325bfC4B00278B4abC5e20bbce2D6580e);
        priceFeed["ETH/USD"] = AggregatorV3Interface(0x9326BFA02ADD2366b30bacB125260Af641031331);
        priceFeed["BNB/USD"] = AggregatorV3Interface(0x8993ED705cdf5e84D0a3B754b5Ee0e1783fcdF16);
        priceFeed["LINK/ETH"] = AggregatorV3Interface(0x3Af8C569ab77af5230596Acf0E8c2F9351d24C38);
    }

    function getXUsdPrice(string memory coin) public view returns (int256) {
        if (
            keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("BTC"))
        ) {
            (,int256 price,,,) = priceFeed["BTC/USD"].latestRoundData();

            return price;
        } else if (
            keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("ETH"))
        ) {
            (,int256 price,,,) = priceFeed["ETH/USD"].latestRoundData();

            return price;
        } else if (
            keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("BNB"))
        ) {
            (,int256 price,,,) = priceFeed["BNB/USD"].latestRoundData();

            return price;
        } else if (
            keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("LINK"))
        ) {
            (,int256 linkToEth,,,) = priceFeed["LINK/ETH"].latestRoundData();
            (,int256 ethToUsd,,,) = priceFeed["ETH/USD"].latestRoundData();

            int256 convertedPrice = _priceConverter.getExchangePrice(
                linkToEth,
                priceFeed["LINK/ETH"].decimals(),
                ethToUsd,
                priceFeed["ETH/USD"].decimals(),
                8
            );
            
            return convertedPrice;
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
