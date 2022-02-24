// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./interface/IMembership.sol";

import "./Member.sol";

contract Membership is Initializable, UUPSUpgradeable, ERC721Upgradeable, IMembership {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Base64 for bytes;
    address payable public dao;

    address[] public members;
    Counters.Counter private _tokenIds;
    mapping(uint256 => Member) public tokenIdToMember;
    mapping(address => uint256) public override ownerToTokenId;

    event CreateMember(address portfolio, address owner);

    function initialize(address _dao, string memory name) public override initializer {
        __ERC721_init(string(abi.encodePacked(name, " Membership")), "MS");
        dao = payable(_dao);
    }

    function mint(address to) public override returns (uint256) {
        require(msg.sender == dao, "access denied");

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        tokenIdToMember[newId] = new Member(address(this));
        ownerToTokenId[to] = newId;
        members.push(address(tokenIdToMember[newId]));
        _safeMint(to, newId, "");
        emit CreateMember(address(tokenIdToMember[newId]), msg.sender);

        return ownerToTokenId[to];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(ownerToTokenId[to] == 0 || to == address(0), "owner can own 1 membership only");
        ownerToTokenId[from] = 0;
        ownerToTokenId[to] = tokenId;
    }

    function lastTokenId() public view override returns (uint256) {
        return _tokenIds.current();
    }

    function totalSupply() public view override returns (uint256) {
        return members.length;
    }

    function tokenURI(uint256 tokenId) public view override(IMembership, ERC721Upgradeable) returns (string memory) {

        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"DaoMembership #",
            tokenId.toString(),
            "\", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            address(tokenIdToMember[tokenId]).toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }

    function _authorizeUpgrade(address) internal override {}
}
