// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";


import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./Portfolio.sol";
import "./ManagementFee.sol";
import "./interface/IAssetManager.sol";
import "./interface/IStrategy.sol";
import "hardhat/console.sol";
import "./interface/IManageable.sol";

contract Strategy is Initializable, UUPSUpgradeable, ERC721Upgradeable, IStrategy {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Base64 for bytes;

    address[] public portfolioList;
    address public mtFeeAccount;
    address payable public assetManager;
    address public adam;
    Counters.Counter private _tokenIds;
    mapping(uint => Portfolio) public tokenIdToPortfolio;
    mapping(address => uint) public ownerToTokenId;

    event CreatePortfolio(address portfolio, address owner);
    event Deposit(address portfolio, uint amount);
    function initialize(address _assetManager, string memory name, address _adam) public override initializer {
        __ERC721_init(string(abi.encodePacked(name, " Portfolio")), "PFLO");
        assetManager = payable(_assetManager);
        adam = _adam;
        mtFeeAccount = address(
            new ManagementFee(
                IManageable(_assetManager).getOwner(),
                address(this),
                _adam
            )
        );
    }

    modifier onlyManagementFee {
        require(mtFeeAccount == msg.sender, "Access denied");
        _;
    }

    function deposit() external payable override returns (address) {
        uint256 tokenId = _upsertPortfolio(msg.sender);
        address _portfolio = address(tokenIdToPortfolio[tokenId]);

        IAssetManager(assetManager).deposit{value: msg.value}(_portfolio);

        emit Deposit(_portfolio, msg.value);
        return _portfolio;
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
    function isSubscriptionValid(address target) public view override returns (bool) {
        return IAssetManager(assetManager).isSubscriptionValid(target);
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

    function redeemManagementFee(address to) external onlyManagementFee override returns (bool) {
        IAssetManager(assetManager).redeemManagementFee(msg.sender, to);
        return true;
    }

    function _authorizeUpgrade(address) internal override {}
}
