// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/draft-ERC721VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./interface/IDao.sol";
import "./interface/ILiquidPool.sol";
import "./lib/Base64.sol";
import "./lib/ToString.sol";
import "./lib/Concat.sol";
import "./lib/InterfaceChecker.sol";

contract Membership is Initializable, ERC721VotesUpgradeable, OwnableUpgradeable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;
    using Concat for string;
    using Base64 for bytes;
    using AddressUpgradeable for address;
    using InterfaceChecker for address;

    struct AdmissionTokenSetting{
        uint256 minTokenToAdmit;
        uint256 tokenId;
        bool active;
        uint256 index;
    }

    uint256 public totalSupply;
    uint256 public maxMemberLimit;

    Counters.Counter private _tokenIds;
    mapping(address => bool) public isMember;
    mapping(address => bool) public wasMember;

    address[] public admissionTokens;
    mapping(address => AdmissionTokenSetting) public admissionTokenSetting;

    event CreateMember(address to);
    event RemoveMember(address member, uint256 tokenId);
    event AddAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId, bool isMemberToken);
    event RemoveAdmissionToken(address token);

    error MemberAlreadyExists(address member);
    error InsufficientAdmissionToken(address member);
    error MemberLimitExceeds();
    error TransferNotAllow();
    error OwnerMemberTokenRequired();
    error AdmissionTokenNotExists();
    error AdmissionTokenAlreadyExists(address token);
    error InvalidContract(address _contract);
    error AdmissionTokenLimitExceeds();
    error Unauthorized();
    error OwnerLiquidPoolBalanceNonZero();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(string memory _name, uint256 _maxMemberLimit) external initializer
    {
        __Ownable_init();
        __EIP712_init(_name.concat(" Membership"), "1");
        __ERC721_init(_name.concat(" Membership"), "MS");
        maxMemberLimit = _maxMemberLimit;
    }

    function createMember(address to) external onlyOwner {
        uint256 _totalSupply = totalSupply;
        if (isMember[to]) {
            revert MemberAlreadyExists(to);
        }
        if (_totalSupply >= maxMemberLimit) {
            revert MemberLimitExceeds();
        }
        if (!isPassAdmissionToken(to)) {
            revert InsufficientAdmissionToken(to);
        }

        _tokenIds.increment();
        uint256 newId = _tokenIds.current();
        _safeMint(to, newId, "");
        totalSupply = _totalSupply + 1;
        isMember[to] = true;
        wasMember[to] = false;

        emit CreateMember(to);
    }

    function _dao() internal view returns (IDao) {
        return IDao(payable(owner()));
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
            revert TransferNotAllow();
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

    function countAdmissionTokens() external view returns(uint256) {
        return admissionTokens.length;
    }

    function setMemberTokenAsAdmissionToken(uint256 minTokenToAdmit) public onlyOwner {
        address _memberToken = _dao().memberToken();
        if (_memberToken == address(0)) {
            revert OwnerMemberTokenRequired();
        }

        _addAdmissionToken(_memberToken, minTokenToAdmit, 0);
        emit AddAdmissionToken(
            _memberToken,
            minTokenToAdmit,
            0,
            true
        );
    }

    function addAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId) public onlyOwner {
        _addAdmissionToken(token, minTokenToAdmit, tokenId);
        emit AddAdmissionToken(
            token,
            minTokenToAdmit,
            tokenId,
            false
        );
    }

    function removeAdmissionToken(address token) public onlyOwner {
        if (!admissionTokenSetting[token].active) {
            revert AdmissionTokenNotExists();
        }
        uint256 index = admissionTokenSetting[token].index;
        address lastEl = admissionTokens[admissionTokens.length - 1];

        admissionTokenSetting[token].active = false;
        admissionTokenSetting[lastEl].index = index;

        admissionTokens[index] = lastEl;
        admissionTokens.pop();

        emit RemoveAdmissionToken(token);
    }

    function isPassAdmissionToken(address account) public view returns (bool){
        uint _admissionTokenLength = admissionTokens.length;
        for (uint i = 0; i < _admissionTokenLength; i++){
            address token = admissionTokens[i];
            uint256 _minTokenToAdmit = admissionTokenSetting[token].minTokenToAdmit;

            if(_minTokenToAdmit > 0 ){
                uint256 balance;
                if(token.isERC721()){
                    balance = IERC721(token).balanceOf(account);
                }else if(token.isERC1155()){
                    balance = IERC1155(token).balanceOf(account, admissionTokenSetting[token].tokenId);
                }else if(token.isERC20()){
                    balance = IERC20(token).balanceOf(account);
                }
                if(balance < _minTokenToAdmit){
                    return false;
                }
            }
        }
        return true;
    }

    function _addAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId) internal {
        if (admissionTokenSetting[token].active) {
            revert AdmissionTokenAlreadyExists(token);
        }
        if (!token.isContract()) {
            revert InvalidContract(token);
        }

        admissionTokens.push(token);
        admissionTokenSetting[token] = AdmissionTokenSetting(
            minTokenToAdmit,
            tokenId,
            true,
            admissionTokens.length - 1
        );
        if (admissionTokens.length > 3) {
            revert AdmissionTokenLimitExceeds();
        }
    }


    function quit(uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        address liquidPool = _dao().liquidPool();

        if (msg.sender != owner) {
            revert Unauthorized();
        }
        if (liquidPool != address(0) && ILiquidPool(payable(liquidPool)).balanceOf(owner) != 0) {
            revert OwnerLiquidPoolBalanceNonZero();
        }
    
        _burn(tokenId);
        isMember[owner] = false;
        wasMember[owner] = true;
        totalSupply = totalSupply - 1;

        _dao().setFirstDepositTime(owner, 0);
        emit RemoveMember(owner, tokenId);

    }

    uint256[50] private __gap;
}
