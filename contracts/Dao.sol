// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IDao.sol";
import "./interface/IAdam.sol";
import "./interface/IMembership.sol";

import "./base/MultiToken.sol";
import "./lib/Concat.sol";
import "./lib/ToString.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";
import "hardhat/console.sol";


struct DaoConfig {
    uint256 locktime;
    bool allowAllTokens;
    mapping(address => bool) depositTokens;
}

contract Dao is Initializable, UUPSUpgradeable, MultiToken, IDao, ERC721HolderUpgradeable {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Concat for string;
    using BytesLib for bytes;

    Counters.Counter private _ERC20tokenIds;

    address public creator;
    address public adam;
    address public override membership;
    mapping(address => bool) public blankets;
    mapping(address => uint256) public firstDeposit;

    DaoConfig public config;

    event SwapToken(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount);
    event CreateBlanket(address blanket);
    event Deposit(address token, uint256 amount);
    event Redeem(address token, uint256 amount);

    function initialize(
        address _adam,
        address _creator,
        string memory _name,
        string memory _symbol,
        address _membership,
        uint256 _locktime,
        address[] calldata _depositTokens
    ) public override initializer {
        __ERC721Holder_init();
        __MultiToken_init(_name, _symbol);

        adam = _adam;
        creator = _creator;
        membership = _membership;
        config.locktime = _locktime;
        uint256 i = 0;
        config.allowAllTokens = _depositTokens.length == 0;
        for(i = 0; i < _depositTokens.length; i++) {
            config.depositTokens[_depositTokens[i]] = true;
        }
    }

    modifier vote(string memory category) {
        // TODO: require(msg.sender == goverances[category], "access denied");
        _;
    }

    function setName(string calldata _name) public override vote("CorporateAction") {
        name = _name;
    }

    function createBlanket(address blanket) public {
        require(IAdam(adam).blankets(blanket), "blanket not whitelist");
        ERC1967Proxy _blanket = new ERC1967Proxy(blanket, "");
        blankets[address(_blanket)] = true;
        emit CreateBlanket(address(_blanket));
    }

    function deposit() public payable {
        require(msg.value > 0, "0 ether");
        require(config.depositTokens[address(0)] || config.allowAllTokens, "not allow");

        address member = _member(msg.sender);
        _mintToken(member, _tokenId(address(0)), msg.value, "");

        emit Deposit(address(0), msg.value);

        if (firstDeposit[member] == 0) {
            firstDeposit[member] = block.timestamp;
        }
    }

    function redeem(uint256 _amount) public {
        uint256 membershipId = IMembership(membership).ownerToTokenId(msg.sender);
        require(membershipId != 0, "no membership");

        address member = IMembership(membership).tokenIdToMember(membershipId);
        require(firstDeposit[member] + config.locktime <= block.timestamp, "lockup time");
        require(_amount <= balanceOf(member, ethId), "request amount too big");

        _burnToken(member, ethId, _amount);
        payable(msg.sender).transfer(_amount);
        emit Redeem(address(0), _amount);
    }

    function depositToken(address _token, uint256 _amount) public {
        require(config.depositTokens[_token] || config.allowAllTokens, "not allow");
        require(IERC20Metadata(_token).allowance(msg.sender, address(this)) >= _amount, "allowance not enough");
        address member = _member(msg.sender);
        IERC20Metadata(_token).transferFrom(msg.sender, address(this), _amount);
        _mintToken(member, _tokenId(_token), _amount, "");

        emit Deposit(_token, _amount);

        if (firstDeposit[member] == 0) {
            firstDeposit[member] = block.timestamp;
        }
    }

    function redeemToken(address _token, uint256 _amount) public {
        uint256 membershipId = IMembership(membership).ownerToTokenId(msg.sender);
        require(membershipId != 0, "no membership");
        require(addressToId[_token] != 0, "token not registered");

        address member = IMembership(membership).tokenIdToMember(membershipId);
        require(firstDeposit[member] + config.locktime <= block.timestamp, "lockup time");
        require(_amount <= balanceOf(member, addressToId[_token]), "request amount too big");

        _burnToken(member, addressToId[_token], _amount);
        IERC20Metadata(_token).transfer(msg.sender, _amount);

        emit Redeem(_token, _amount);
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