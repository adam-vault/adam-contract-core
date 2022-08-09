// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./lib/ToString.sol";
import "./lib/Base64.sol";

contract Team is Initializable, UUPSUpgradeable, ERC1155Upgradeable {
	using Counters for Counters.Counter;
	using ToString for address;
	using Base64 for bytes;

	event EditInfo(string name, string description, uint256 tokenId);

	mapping(uint256 => address) public creatorOf;
	mapping(uint256 => address) public minterOf;
	mapping(uint256 => string) public nameOf;
	mapping(uint256 => string) public descriptionOf;

	Counters.Counter private _tokenIds;

	modifier onlyTeamMinter(uint256 id, address minter) {
		require(minterOf[id] == minter, "Team: only selected minter");
		_;
	}

  function initialize() public initializer {
    __ERC1155_init("");
  }

	function _beforeTokenTransfer(
			address operator,
			address from,
			address to,
			uint256[] memory ids,
			uint256[] memory amounts,
			bytes memory data
	) internal override {
		if (from == address(0)) { // mint
			require(balanceOf(to, ids[0]) == 0, "Team: Member/Members already added");
		}

		if (to == address(0)) { // burn
			require(balanceOf(from, ids[0]) > 0, "Team: Member/Members not exists");
		}

		if (from != address(0) && to != address(0)) {
			revert("Team: Transfer of team ownership is aboundand");
		} 
	}

	function _mintTokens(address[] memory members, uint256 tokenId) private {
		for(uint i = 0; i < members.length ; i++) {
			_mint(
				members[i],
				tokenId,
				1,
				""
			);
		}
	}

	function _burnTokens(address[] memory members, uint256 tokenId) private {
		for(uint i = 0; i < members.length; i++) {
			_burn(members[i], tokenId, balanceOf(members[i], tokenId));
		}
	}

	function addTeam(string memory name, address minter, address[] memory members, string memory description) public returns (uint256) {
		_tokenIds.increment();
		creatorOf[_tokenIds.current()] = msg.sender;
		minterOf[_tokenIds.current()] = minter;
		nameOf[_tokenIds.current()] = name;
		descriptionOf[_tokenIds.current()] = description;

		_mintTokens(members, _tokenIds.current());

		return _tokenIds.current();
	}

	function addMembers(address[] memory members, uint256 tokenId) public onlyTeamMinter(tokenId, msg.sender) {
		_mintTokens(members, tokenId);
	}

	function removeMembers(address[] memory members, uint256 tokenId) public onlyTeamMinter(tokenId, msg.sender) {
		_burnTokens(members, tokenId);
	}

	function setInfo(string memory name, string memory description, uint256 tokenId) public onlyTeamMinter(tokenId, msg.sender){
    nameOf[tokenId] = name;
		descriptionOf[tokenId] = description;

		emit EditInfo(name, description, tokenId);
	}
 
 	function uri(uint256 _id) public view override returns (string memory) {
		string memory metadata = string(abi.encodePacked(
			"{\"name\": \"",
			nameOf[_id],
			"\", \"creator\": \"",
			creatorOf[_id].toString(),
			"\", \"minter\": \"",
			minterOf[_id].toString(),
			"\", \"description\": \"",
			descriptionOf[_id], "\"",
			"}"
		));

		return string(abi.encodePacked(
			"data:application/json;base64,",
			bytes(metadata).base64()
		));
	}

	function _authorizeUpgrade(address newImplementation) internal override initializer {}
}
