// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
interface IMembership {
    event CreateMember(address member, address owner);

    function initialize(address _dao, string memory _name, string memory _symbol) external;
    function createMember(address to) external returns (uint256, address);
    function lastTokenId() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function ownerToTokenId(address) external view returns (uint256);
    function tokenIdToMember(uint256) external view returns (address);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
