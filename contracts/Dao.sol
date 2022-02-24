// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "./interface/IDao.sol";
import "./interface/IMembership.sol";

import "./base/MultiToken.sol";
import "./lib/Concat.sol";
import "./lib/ToString.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";

contract Dao is Initializable, UUPSUpgradeable, MultiToken, IDao, ERC721HolderUpgradeable {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Concat for string;
    using BytesLib for bytes;

    Counters.Counter private _ERC20tokenIds;

    address public creator;
    address public adam;
    address public membership;

    event SwapToken(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount);

    function initialize(
        address _adam,
        address _creator,
        string memory _name,
        string memory _symbol,
        address _membership
    ) public override initializer {
        __ERC721Holder_init();
        __MultiToken_init(_name, _symbol);

        adam = _adam;
        creator = _creator;
        membership = _membership;
    }

    function deposit() public payable {
        require(msg.value > 0, "0 ether");
        address member = _member(msg.sender);
        _mintToken(member, _tokenId(address(0)), msg.value, "");
    }

    function redeem(uint256 _amount) public {
        uint256 membershipId = IMembership(membership).ownerToTokenId(msg.sender);
        require(membershipId != 0, "no membership");

        address member = IMembership(membership).tokenIdToMember(membershipId);
        require(_amount <= balanceOf(member, ethId), "request amount too big");

        _burnToken(member, ethId, _amount);
        payable(msg.sender).transfer(_amount);
    }

    function depositToken(address _token, uint256 _amount) public {
        require(IERC20Metadata(_token).allowance(msg.sender, address(this)) >= _amount, "allowance not enough");
        address member = _member(msg.sender);
        IERC20Metadata(_token).transferFrom(msg.sender, address(this), _amount);
        _mintToken(member, _tokenId(_token), _amount, "");
    }

    function redeemToken(address _token, uint256 _amount) public {
        uint256 membershipId = IMembership(membership).ownerToTokenId(msg.sender);
        require(membershipId != 0, "no membership");
        require(addressToId[_token] != 0, "token not registered");

        address member = IMembership(membership).tokenIdToMember(membershipId);
        require(_amount <= balanceOf(member, addressToId[_token]), "request amount too big");

        _burnToken(member, addressToId[_token], _amount);
        IERC20Metadata(_token).transfer(msg.sender, _amount);
    }

    function _tokenId(address contractAddress) internal returns (uint256){
        if (addressToId[contractAddress] == 0) {
            _createToken(contractAddress);
        }
        return addressToId[contractAddress];
    }

    function _member(address owner) internal returns (address) {
        uint256 memberTokenId = IMembership(membership).ownerToTokenId(owner);
        if (memberTokenId == 0) {
            (memberTokenId,) = IMembership(membership).createMember(owner);
        }
        return IMembership(membership).tokenIdToMember(memberTokenId);
    }

    function _authorizeUpgrade(address newImplementation) internal override {}

}