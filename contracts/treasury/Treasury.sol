// //SPDX-License-Identifier: Unlicense
// pragma solidity ^0.8.0;

// import "hardhat/console.sol";
// import "./DSMath.sol";
// import "./interfaces/IToken.sol";
// import "./interfaces/IPriceConverter.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// contract Treasury {
//     using DSMath for uint;
//     string[] public basketCoins;
//     mapping(string => uint) public basket;
//     mapping(string => AggregatorV3Interface) public priceFeed;
//     IToken private _token;
//     IPriceConverter private _priceConverter;

//     constructor(address token, address priceConverter) public {
//         _token = IToken(token);
//         _priceConverter = IPriceConverter(priceConverter);
//         basketCoins = ["BTC", "ETH", "BNB", "SOL", "ADA", "XRP", "LUNA", "DOT", "AVAX", "DOGE"];

//         // value would need to div by 10**4, no Luna in Kovan
//         basket["BTC"] = 100;
//         basket["ETH"] = 629;
//         basket["BNB"] = 881;
//         basket["SOL"] = 1645;
//         basket["ADA"] = 177047;
//         basket["XRP"] = 251410;
//         basket["LUNA"] = 1894;
//         basket["DOT"] = 5219;
//         basket["AVAX"] = 1290;
//         basket["DOGE"] = 701066;

//         /**
//             provided by chainlink
//             REMARK: ETH qoute = 18 decimals, USD quote = 8 decimals
//         */
//         // mainet
//         priceFeed["BTC/USD"] = AggregatorV3Interface(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c);
//         priceFeed["ETH/USD"] = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
//         priceFeed["BNB/USD"] = AggregatorV3Interface(0x14e613AC84a31f709eadbdF89C6CC390fDc9540A);
//         priceFeed["SOL/USD"] = AggregatorV3Interface(0x4ffC43a60e009B551865A93d232E33Fce9f01507);
//         priceFeed["ADA/USD"] = AggregatorV3Interface(0xAE48c91dF1fE419994FFDa27da09D5aC69c30f55);
//         priceFeed["XRP/USD"] = AggregatorV3Interface(0xCed2660c6Dd1Ffd856A5A82C67f3482d88C50b12);
//         priceFeed["LUNA/ETH"] = AggregatorV3Interface(0x91E9331556ED76C9393055719986409e11b56f73);
//         priceFeed["DOT/USD"] = AggregatorV3Interface(0x1C07AFb8E2B827c5A4739C6d59Ae3A5035f28734);
//         priceFeed["AVAX/USD"] = AggregatorV3Interface(0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7);
//         priceFeed["DOGE/USD"] = AggregatorV3Interface(0x2465CefD3b488BE410b941b1d4b2767088e2A028);
//     }

//     function getXUsdPrice(string memory coin) internal view returns (int) {
//         if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("BTC"))
//         ) {
//             (,int price,,,) = priceFeed["BTC/USD"].latestRoundData();
            
//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("ETH"))
//         ) {
//             (,int price,,,) = priceFeed["ETH/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("BNB"))
//         ) {
//             (,int price,,,) = priceFeed["BNB/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("SOL"))
//         ) {
//             (,int price,,,) = priceFeed["SOL/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("ADA"))
//         ) {
//             (,int price,,,) = priceFeed["ADA/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("XRP"))
//         ) {
//             (,int price,,,) = priceFeed["XRP/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("LUNA"))
//         ) {
//             (,int lunaToEth,,,) = priceFeed["LUNA/ETH"].latestRoundData();
//             (,int ethToUsd,,,) = priceFeed["ETH/USD"].latestRoundData();

//             int convertedPrice = _priceConverter.getExchangePrice(
//                 lunaToEth,
//                 priceFeed["LUNA/ETH"].decimals(),
//                 ethToUsd,
//                 priceFeed["ETH/USD"].decimals(),
//                 8
//             );
            
//             return convertedPrice;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("DOT"))
//         ) {
//             (,int price,,,) = priceFeed["DOT/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("AVAX"))
//         ) {
//             (,int price,,,) = priceFeed["AVAX/USD"].latestRoundData();

//             return price;
//         } else if (
//             keccak256(abi.encodePacked(coin)) == keccak256(abi.encodePacked("DOGE"))
//         ) {
//             (,int price,,,) = priceFeed["DOGE/USD"].latestRoundData();

//             return price;
//         }
        
//     }

//     function debug(string memory coin) public view returns (int) {
//        return getXUsdPrice(coin);
//     }

//     function getEDTPrice() public view returns (uint) {
//         uint EDTPrice = 0;
//         for (uint i = 0; i < basketCoins.length; i++) {
//             string memory coin = basketCoins[i];
//             uint takeUpRatio = uint(basket[coin]).wdiv(10**4);
//             int coinPrice = getXUsdPrice(coin);
//             uint temp = uint(coinPrice).wmul(takeUpRatio);

//             EDTPrice = EDTPrice.add(temp);
//         }

//         return EDTPrice;
//     }


//     function exchangeEDT(address to, string memory coinType, uint value) public payable returns (int) {
//         address from = msg.sender;
//         int EDTValue = int(getEDTPrice());
//         int coinValue = getXUsdPrice(coinType);


//         //UNKNOW / USD / EDT / USD ==> UNKNOW / EDT
//         int perEDT = _priceConverter.getDerivedPrice(
//             coinValue,
//             8,
//             EDTValue,
//             8,
//             18
//         );
//         uint amount = uint(perEDT) * value / (10 ** 8);
//         _token.mint(to, amount);

//         return int(amount);
//     }
// }
