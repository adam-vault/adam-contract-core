// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./lib/ToString.sol";
import "./lib/Base64.sol";

contract Team is Initializable, ERC1155Upgradeable, OwnableUpgradeable {
	using Counters for Counters.Counter;
	using ToString for address;
	using Base64 for bytes;

	event EditInfo(string name, string description, uint256 tokenId);
	event AddTeam(uint256 tokenId, address minter, string name, string description);
	event AddMembers(uint256 tokenId, address[] members);
	event RemoveMembers(uint256 tokenId, address[] members);
	event SetMinter(uint256 tokenId, address minter);

	error Unauthorized();
	error TransferNotAllowed();
	error InvalidAddress(address addr);
	error MemberExists(uint256 tokenId, address member);
	error MemberNotFound(uint256 tokenId, address member);

	mapping(uint256 => address) public minterOf;
	mapping(uint256 => string) public nameOf;
	mapping(uint256 => string) public descriptionOf;

	Counters.Counter private _tokenIds;

	modifier onlyTeamMinter(uint256 id) {
		if (minterOf[id] != msg.sender) {
			revert Unauthorized();
		}
		_;
	}

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
	__Ownable_init();
    __ERC1155_init("");
  }

	function _beforeTokenTransfer(
		address,
		address from,
		address to,
		uint256[] memory ids,
		uint256[] memory,
		bytes memory
	) internal view override {
		if (from == address(0)) { // mint
			for(uint i = 0; i < ids.length; i++) {
				if (balanceOf(to, ids[i]) > 0) {
					revert MemberExists(ids[i], to);
				}
			}
		}

		if (to == address(0)) { // burn
			for(uint i = 0; i < ids.length; i++) {
				if (balanceOf(from, ids[i]) == 0) {
					revert MemberNotFound( ids[i], from);
				}
			}
		}

		if (from != address(0) && to != address(0)) {
			revert TransferNotAllowed();
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

	function addTeam(string memory name, address minter, address[] memory members, string memory description) external onlyOwner returns (uint256) {
		if (minter == address(0)) {
			revert InvalidAddress(minter);
		}
		_tokenIds.increment();
		uint256 _tokenId = _tokenIds.current();

		minterOf[_tokenId] = minter;
		nameOf[_tokenId] = name;
		descriptionOf[_tokenId] = description;
		_mintTokens(members, _tokenId);

		emit AddTeam(_tokenId, minter, name, description);

		return _tokenId;
	}

	function addMembers(address[] memory members, uint256 tokenId) external onlyTeamMinter(tokenId) {
		_mintTokens(members, tokenId);
		emit AddMembers(tokenId, members);
	}

	function removeMembers(address[] memory members, uint256 tokenId) external onlyTeamMinter(tokenId) {
		_burnTokens(members, tokenId);
		emit RemoveMembers(tokenId, members);
	}

	function setMinter(address minter, uint256 tokenId) external onlyTeamMinter(tokenId) {
		if (minter == address(0)) {
			revert InvalidAddress(minter);
		}
		minterOf[tokenId] = minter;
		emit SetMinter(tokenId, minter);
	}

	function setInfo(string memory name, string memory description, uint256 tokenId) external onlyTeamMinter(tokenId) {
    	nameOf[tokenId] = name;
		descriptionOf[tokenId] = description;

		emit EditInfo(name, description, tokenId);
	}
 
 	function uri(uint256 _id) public view override returns (string memory) {
		string memory metadata = string(abi.encodePacked(
			"{\"name\": \"",
			nameOf[_id],
			"\", \"creator\": \"",
			owner().toString(),
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

  	uint256[50] private __gap;
}
