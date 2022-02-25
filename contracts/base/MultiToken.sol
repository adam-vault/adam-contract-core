// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../lib/ToString.sol";
import "../lib/Base64.sol";
import "../lib/Concat.sol";

contract MultiToken is ERC1155Upgradeable {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Strings for uint8;
    using ToString for address;
    using Base64 for bytes;
    using Concat for string;

    struct Token {
        uint256 id;
        address contractAddress;
        uint256 totalSupply;
        bool isExist;
    }

    Counters.Counter private _tokenIds;
    mapping(uint256 => Token) private _tokenRegistry;

    mapping(address => uint256) public addressToId;
    uint256 public ethId;
    string public name;
    string public symbol;

    event CreateToken(uint256 id, address contractAddress);
    function __MultiToken_init(string memory _name, string memory _symbol) internal onlyInitializing {
        __ERC1155_init("");
        // default init ether as 0x0 address
        name = _name;
        symbol = _symbol;
        ethId = _createToken(address(0));
    }
    
    function lastTokenId() public view returns (uint256) {
        return _tokenIds.current();
    }

    function _createToken(address _contractAddress) internal returns (uint256) {
        _tokenIds.increment();
        uint256 id = _tokenIds.current();
        addressToId[_contractAddress] = id;
        _tokenRegistry[id] = Token({
            id: id,
            contractAddress: _contractAddress,
            totalSupply: 0,
            isExist: true
        });
        emit CreateToken(id, _contractAddress);
        return id;
    }

    function _mintToken(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        _tokenRegistry[id].totalSupply += amount;
        return _mint(to, id, amount, data);
    }
    

    function _burnToken(
        address from,
        uint256 id,
        uint256 amount
    ) internal {
        _tokenRegistry[id].totalSupply -= amount;
        return _burn(from, id, amount);
    }
    

    function tokenName(uint256 _id) public view returns (string memory) {
        if (_id == ethId) return "ETH";
        return IERC20Metadata(_tokenRegistry[_id].contractAddress).name();
    }

    function tokenDecimals(uint256 _id) public view returns (uint8) {
        if (_id == ethId) return 18;
        try IERC20Metadata(_tokenRegistry[_id].contractAddress).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }
    function tokenAddress(uint256 _id) public view returns (address) {
        return _tokenRegistry[_id].contractAddress;
    }

    function tokenTotalSupply(uint256 _id) public view returns (uint256) {
        return _tokenRegistry[_id].totalSupply;
    }

    function uri(uint256 _id) public view override returns (string memory) {
        string memory postfix = string(" (").concat(name).concat(")");
        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            tokenName(_id),
            postfix,
            "\", \"decimals\": ",
            tokenDecimals(_id).toString(),
            ", \"totalSupply\": ",
            tokenTotalSupply(_id).toString(),
            ", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            tokenAddress(_id).toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }
}