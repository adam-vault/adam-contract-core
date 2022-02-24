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

    mapping(address => uint) erc20ToTokenId;
    mapping(uint => address) tokenIdToErc20;
    address public creator;
    address public adam;
    address public membership;

    string public daoName;

    event SwapToken(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount);

    function initialize(address _adam, address _creator, string memory _name, address _membership) public override initializer {
        __ERC721Holder_init();
        __MultiToken_init(" (Adam)");

        adam = _adam;
        creator = _creator;
        daoName = _name;
        membership = _membership;
    }

    receive() public payable {
        require(msg.value > 0, "0 ether");
        uint256 memberTokenId = IMembership(_membership).ownerToTokenId(_creator);
        if (memberTokenId == 0) {
            address member = IMembership(_membership).mint(_creator);
            _mintToken(member, _ERC20tokenId(address(0)), msg.value, "");
        } else {
            address member = IMembership(_membership).tokenIdToMember(memberTokenId);
            _mintToken(member, _ERC20tokenId(address(0)), msg.value, "");
        }
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes memory data
    ) public override returns (bytes4) {

        uint256 memberTokenId = IMembership(_membership).ownerToTokenId(_from);
        if (memberTokenId == 0) {
            address member = IMembership(_membership).mint(_from);
            _mintToken(member, _ERC721tokenId(address(msg.sender)), 1, "");
        } else {
            address member = IMembership(_membership).tokenIdToMember(memberTokenId);
            _mintToken(member, _ERC721tokenId(address(msg.sender)), 1, "");
        }

        return this.onERC721Received.selector;
    }

    function name() public view returns (string memory) {
        return daoName.concat(" Asset");
    }
    function symbol() public view returns (string memory) {
        return daoName.concat(" A");
    }

    function _ERC20tokenId(address contractAddress) public returns (uint256){
        if (!contractRegistered(contractAddress)) {
            _createToken(contractAddress, IERC20Metadata(contractAddress).name(), IERC20Metadata(contractAddress).decimals());
        }
        return addressToId[contractAddress];
    }
    function _ERC721tokenId(address contractAddress) public returns (uint256){
        if (!contractRegistered(contractAddress)) {
            _createToken(contractAddress, IERC20Metadata(contractAddress).name(), 0);
        }
        return addressToId[contractAddress];
    }

    function _authorizeUpgrade(address newImplementation) internal override {}

}