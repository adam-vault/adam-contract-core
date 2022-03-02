// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IDao {
    function initialize(address _adam, address _owner, string memory _name, string memory _symbol, address _membership, uint256 _locktime,
        address[] calldata _depositTokens) external;
    function setName(string calldata _name) external;
    function membership() external view returns (address);
}
