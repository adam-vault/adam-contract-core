// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/draft-ERC721VotesUpgradeable.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interface/IDao.sol";
import "./interface/ILiquidPool.sol";

import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./lib/Concat.sol";

contract Membership is Initializable, ERC721VotesUpgradeable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Concat for string;
    using Base64 for bytes;

    address payable public dao;
    uint256 public totalSupply;
    uint256 public maxMemberLimit;

    Counters.Counter private _tokenIds;
    mapping(address => bool) public isMember;
    mapping(address => bool) public wasMember;

    event CreateMember(address to);
    event RemoveMember(address member, uint256 tokenId);

    modifier onlyDao() {
        require(msg.sender == dao, "not dao");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(address _dao, string memory _name, uint256 _maxMemberLimit) external initializer
    {
        __EIP712_init(_name.concat(" Membership"), "1");
        __ERC721_init(_name.concat(" Membership"), "MS");
        dao = payable(_dao);
        maxMemberLimit = _maxMemberLimit;
    }

    function createMember(address to) external onlyDao {
        uint256 _totalSupply = totalSupply;
        require(!isMember[to], "Member already created");
        require(_totalSupply < maxMemberLimit, "member count exceed limit");

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        _safeMint(to, newId, "");
        totalSupply = _totalSupply + 1;
        isMember[to] = true;
        wasMember[to] = false;

        emit CreateMember(to);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {

        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            name(),
            " #",
            tokenId.toString(),
            "\"}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }

    function _beforeTokenTransfer(
      address from,
      address to,
      uint256 tokenId
    ) internal override {
        if (from != address(0) && to != address(0)) {
		    revert("Membership: Transfer of membership is aboundand");
		}
        super._beforeTokenTransfer(from, to, tokenId); 
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._afterTokenTransfer(from, to, tokenId);
        // check if it is mint and delegatee is not yet delegated

        if (from == address(0) && to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function quit(uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        address liquidPool = IDao(dao).liquidPool();

        require(msg.sender == owner, "Permission denied");
        require(ILiquidPool(payable(liquidPool)).balanceOf(owner) == 0, "LP balance is not zero");
    
        _burn(tokenId);
        isMember[owner] = false;
        wasMember[owner] = true;
        totalSupply = totalSupply - 1;

        IDao(dao).setFirstDepositTime(owner, 0);
        emit RemoveMember(owner, tokenId);

    }

    uint256[50] private __gap;
}
