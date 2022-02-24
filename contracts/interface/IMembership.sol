// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IMembership {
    function initialize(address _dao, string memory name) external;
    function mint(address to) external returns (uint256);
    function lastTokenId() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function ownerToTokenId(address) external view returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
