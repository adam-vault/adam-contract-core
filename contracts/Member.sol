// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Member is ERC1155Holder {

    address public dao;
    constructor(address _dao){
        dao = _dao;
    }
}