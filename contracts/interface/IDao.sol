// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "../lib/SharedStruct.sol";

interface IDao {
    function initialize(address _adam, address _owner, string memory _name, string memory _symbol, address _membership, address _governFactory) external;
}
