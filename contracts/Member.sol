// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Member is ERC1155Holder {

    address public dao;
    uint256 public tokenId;
    constructor(address _dao, uint256 _tokenId){
        dao = _dao;
        tokenId = _tokenId;
    }
}