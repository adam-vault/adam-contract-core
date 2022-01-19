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
    using ToString for address;
    using Base64 for bytes;

    Counters.Counter private _tokenIds;
    string public postfix;
    address[] public mintedContracts;

    mapping(address => uint256) public addressToId;
    mapping(uint256 => address) public idToAddress;
    mapping(uint256 => string) public idToName;
    mapping(uint256 => uint256) public idToDecimal;

    constructor(string memory _postfix) ERC1155("") {
        postfix = _postfix;
        // default init ether as 0x0 address
        _createToken(address(0x0), "ETH", 18);
    }

    function _createToken(address _contractAddress, string memory _name, uint256 _decimal) internal returns (uint) {
        _tokenIds.increment();
        mintedContracts.push(_contractAddress);
        addressToId[_contractAddress] = _tokenIds.current();
        idToAddress[_tokenIds.current()] = _contractAddress;
        idToName[_tokenIds.current()] = _name;
        idToDecimal[_tokenIds.current()] = _decimal;

        return _tokenIds.current();
    }
    
    function uri(uint256 _id) public view override returns (string memory) {
        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            idToName[_id],
            postfix,
            "\", \"decimal\": ",
            idToDecimal[_id].toString(),
            ", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            idToAddress[_id].toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }
}