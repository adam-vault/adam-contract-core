// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./lib/Concat.sol";
import "./interface/IMembership.sol";
import "hardhat/console.sol";

import "./Member.sol";

contract Membership is Initializable, UUPSUpgradeable, ERC721Upgradeable, IMembership {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Concat for string;

    using Base64 for bytes;
    address payable public dao;

    address[] public members;
    Counters.Counter private _tokenIds;
    mapping(uint256 => address) public override tokenIdToMember;
    mapping(address => uint256) public override ownerToTokenId;

    function initialize(address _dao, string memory _name, string memory _symbol) public override initializer {
        __ERC721_init(_name.concat(" Membership"), _symbol.concat("MS"));
        dao = payable(_dao);
    }

    function createMember(address to) public override returns (uint256, address) {
        require(msg.sender == dao, "access denied");

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        Member member = new Member(address(this), newId);
        tokenIdToMember[newId] = address(member);
        members.push(address(member));
        _safeMint(to, newId, "");
        emit CreateMember(tokenIdToMember[newId], msg.sender);

        return (ownerToTokenId[to], tokenIdToMember[newId]);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(ownerToTokenId[to] == 0, "owner can own 1 membership only");
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
            "{\"name\": \"",
            name(),
            " #",
            tokenId.toString(),
            "\", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            tokenIdToMember[tokenId].toString(),
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
