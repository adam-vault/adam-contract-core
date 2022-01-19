// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../lib/ToString.sol";
import "../lib/Base64.sol";

contract MultiToken is ERC1155 {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Strings for uint8;
    using ToString for address;
    using Base64 for bytes;
    struct Token {
        uint256 id;
        string name;
        address contractAddress;
        uint8 decimal;
        uint256 totalSupply;
        bool isExist;
    }

    Counters.Counter private _tokenIds;
    string public postfix;
    address[] public mintedContracts;

    mapping(address => uint256) public addressToId;
    mapping(uint256 => Token) public tokenRegistry;

    event CreateToken(uint256 id, string name, address contractAddress, uint8 decimal);

    constructor(string memory _postfix) ERC1155("") {
        postfix = _postfix;
        // default init ether as 0x0 address
        _createToken(address(0x0), "ETH", 18);
    }

    function _createToken(address _contractAddress, string memory _name, uint8 _decimal) internal returns (uint256) {
        _tokenIds.increment();
        uint256 id = _tokenIds.current();
        mintedContracts.push(_contractAddress);
        addressToId[_contractAddress] = id;
        tokenRegistry[id] = Token({
            id: id,
            name: _name,
            contractAddress: _contractAddress,
            decimal: _decimal,
            totalSupply: 0,
            isExist: true
        });
        emit CreateToken(id, _name, _contractAddress, _decimal);
        return id;
    }
    
    function uri(uint256 _id) public view override returns (string memory) {
        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            tokenRegistry[_id].name,
            postfix,
            "\", \"decimal\": ",
            tokenRegistry[_id].decimal,
            ", \"totalSupply\": ",
            tokenRegistry[_id].totalSupply,
            ", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            tokenRegistry[_id].contractAddress.toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }
}