// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/draft-ERC721VotesUpgradeable.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./lib/Concat.sol";
import "hardhat/console.sol";

contract Membership is Initializable, UUPSUpgradeable, ERC721VotesUpgradeable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Concat for string;
    using Base64 for bytes;

    address payable public dao;
    uint256 public totalSupply;

    Counters.Counter private _tokenIds;
    mapping(address => bool) public isMember;

    event CreateMember(address to);

    function initialize(address _dao, string memory _name) public initializer
    {
        __ERC721_init(_name.concat(" Membership"), "MS");
        dao = payable(_dao);
    }

    /**
     * @notice create member
     * @param to address of new member
     */
    function createMember(address to) public {
        require(msg.sender == dao, "access denied");

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        _safeMint(to, newId, "");
        totalSupply++;
        isMember[to] = true;

        emit CreateMember(to);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {

        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            name(),
            " #",
            tokenId.toString(),
            "\"}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._afterTokenTransfer(from, to, tokenId);
        // check if it is mint and delegatee is not yet delegated

        if (from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function _authorizeUpgrade(address) internal override {}
}
