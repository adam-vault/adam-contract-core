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

	event AddTeam(string name, address minter, address[] members, string description, uint256 tokenId);
	event AddMembers(address[] members, uint256 tokenId);
	event RemoveMembers(address[] members, uint256 tokenId);
	event EditDescription(string description, uint256 tokenId);

	mapping(uint256 => address) public creatorList;
	mapping(uint256 => address) public minterList;
	mapping(uint256 => string) public nameList;
	mapping(uint256 => string) public descriptions;

	Counters.Counter private _tokenIds;

	modifier onlyTeamMinter(uint256 id, address minter) {
		require(minterList[id] == minter, "Team: only selected minter");
		_;
	}

	function initialize() public initializer {
		__ERC1155_init("");
	}

	function addTeam(string memory name, address minter, address[] memory members, string memory description) public returns (uint256) {
		_tokenIds.increment();
		creatorList[_tokenIds.current()] = msg.sender;
		minterList[_tokenIds.current()] = minter;
		nameList[_tokenIds.current()] = name;
		descriptions[_tokenIds.current()] = description;

		for(uint i = 0; i < members.length ; i++) {
			_mint(
				members[i],
				_tokenIds.current(),
				1,
				""
			);
		}

		emit AddTeam(name, minter, members, description, _tokenIds.current());

		return _tokenIds.current();
	}

	function addMembers(address[] memory members, uint256 tokenId) public onlyTeamMinter(tokenId, msg.sender) {
		for(uint i = 0; i < members.length; i++) {
			address newComer = members[i];

			if (balanceOf(newComer, tokenId) == 0) {
				_mint(newComer, tokenId, 1, "");

				emit AddMembers(members, tokenId);
			}
		}
	}

	function removeMembers(address[] memory members, uint256 tokenId) public onlyTeamMinter(tokenId, msg.sender) {
		for(uint i = 0; i < members.length; i++) {
			_burn(members[i], tokenId, balanceOf(members[i], tokenId));
		}

		emit RemoveMembers(members, tokenId);
	}

	function setDescription(string memory description, uint256 tokenId) public onlyTeamMinter(tokenId, msg.sender){
		descriptions[tokenId] = description;

		emit EditDescription(description, tokenId);
	}
 
 	function uri(uint256 _id) public view override returns (string memory) {
		string memory metadata = string(abi.encodePacked(
			"{\"name\": \"",
			nameList[_id],
			"\", \"creator\": \"",
			creatorList[_id].toString(),
			"\", \"minter\": \"",
			minterList[_id].toString(),
			"\", \"description\": \"",
			descriptions[_id], "\"",
			"}"
		));

		return string(abi.encodePacked(
			"data:application/json;base64,",
			bytes(metadata).base64()
		));
	}

	function safeTransferFrom(
				address from,
				address to,
				uint256 id,
				uint256 amount,
				bytes memory data
		) public override pure {
		// transfer of team membership is abandoned
		revert("Transfer is abandoned");
	}

	function safeBatchTransferFrom(
				address from,
				address to,
				uint256[] memory ids,
				uint256[] memory amounts,
				bytes memory data
		) public override pure {
				revert("Transfer is abandoned");
		}

	function _authorizeUpgrade(address newImplementation) internal override initializer {}
}
