// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Base64.sol";
import "./Portfolio.sol";
import "./ToString.sol";


interface IAssetManager {
    function deposit(address portfolio) payable external;
}

contract Strategy is ERC721 {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Base64 for bytes;

    address[] public portfolioList;
    address payable public assetManager;
    Counters.Counter private _tokenIds;
    mapping(uint => Portfolio) public tokenIdToPortfolio;

    constructor(string memory name) ERC721(string(abi.encodePacked(name, " Portfolio")), "PFLO") {
        assetManager = payable(msg.sender);
    }

    function deposit() external payable {
        _tokenIds.increment();
        uint256 newId = _tokenIds.current();

        tokenIdToPortfolio[newId] = new Portfolio(msg.sender, address(this));
        portfolioList.push(address(tokenIdToPortfolio[newId]));
        _safeMint(msg.sender, newId);

        IAssetManager(assetManager).deposit{value: msg.value}(address(tokenIdToPortfolio[newId]));
    }

    function getLastTokenId() public view returns (uint) {
        return _tokenIds.current();
    }

    // function tokenURI(uint256 tokenId) public view override returns (string memory) {

    //     string memory metadata = string(abi.encodePacked(
    //         "{\"name\": \"Adam Portfolio #",
    //         tokenId.toString(),
    //         "\", \"description\": \"\", \"attributes\":",
    //         "[{\"key\":\"address\",\"value\":\"",
    //         address(tokenIdToPortfolio[tokenId]).toString(),
    //         "\"}]",
    //         "}"
    //     ));

    //     return string(abi.encodePacked(
    //         "data:application/json;base64,",
    //         bytes(metadata).base64()
    //     ));
    // }
}
