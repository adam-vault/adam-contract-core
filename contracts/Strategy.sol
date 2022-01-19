// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./Portfolio.sol";
import "./interface/IAssetManager.sol";
import "./interface/IStrategy.sol";

contract Strategy is ERC721, IStrategy {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Base64 for bytes;

    address[] public portfolioList;
    address payable public assetManager;
    Counters.Counter private _tokenIds;
    mapping(uint => Portfolio) public tokenIdToPortfolio;
    mapping(address => uint) public ownerToTokenId;

    event CreatePortfolio(address portfolio, address owner);
    event Deposit(address portfolio, uint amount);

    constructor(address _assetManager, string memory name) ERC721(string(abi.encodePacked(name, " Portfolio")), "PFLO") {
        assetManager = payable(_assetManager);
    }

    function deposit() external payable override {
        uint256 tokenId = _upsertPortfolio(msg.sender);
        IAssetManager(assetManager).deposit{value: msg.value}(address(tokenIdToPortfolio[tokenId]));
        emit Deposit(address(tokenIdToPortfolio[tokenId]), msg.value);
    }

    function _upsertPortfolio(address owner) internal returns (uint256) {
        if (ownerToTokenId[owner] == 0) {
            _tokenIds.increment();
            uint256 newId = _tokenIds.current();
            tokenIdToPortfolio[newId] = new Portfolio(owner, address(this));
            ownerToTokenId[owner] = newId;
            portfolioList.push(address(tokenIdToPortfolio[newId]));
            _safeMint(msg.sender, newId);
            emit CreatePortfolio(address(tokenIdToPortfolio[newId]), msg.sender);
        }
        return ownerToTokenId[owner];
    }

    function getLastTokenId() public view returns (uint256) {
        return _tokenIds.current();
    }

    function countPortfolio() public view returns (uint256) {
        return portfolioList.length;
    }
    function tokenURI(uint256 tokenId) public view override returns (string memory) {

        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"Adam Portfolio #",
            tokenId.toString(),
            "\", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            address(tokenIdToPortfolio[tokenId]).toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }
}
