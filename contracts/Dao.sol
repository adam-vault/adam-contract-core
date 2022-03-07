// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IBudgetApproval.sol";

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

contract Dao is Initializable, UUPSUpgradeable, MultiToken, ERC721HolderUpgradeable {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Concat for string;
    using BytesLib for bytes;

    address constant public ETH_ADDRESS = address(0x0);

    Counters.Counter private _ERC20tokenIds;

    address public creator;
    address public adam;
    address public membership;
    mapping(address => bool) public budgetApprovals;
    mapping(address => uint256) public firstDeposit;

    DaoConfig public config;

    event SwapToken(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount);
    event CreateBudgetApproval(address budgetApproval);
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
    ) public initializer {
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

    function setName(string calldata _name) public vote("CorporateAction") {
        name = _name;
    }

    function createBudgetApprovals(address[] calldata _budgetApprovals, bytes[] calldata data) public {

        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(IAdam(adam).budgetApprovalRegistry(_budgetApprovals[i]), "budget approval not whitelist");
            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], "");
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval));

            // initialize(address,address,string,string,bool,address[],bool,address[],bool,uint256,uint8)
            (bool success,) = address(_budgetApproval).call(data[i]);
            require(success == true, "init failed");
        }
    }

    function executeTransactionByBudgetApprovals (address budgetApproval, bytes calldata data) public {

        if(data.toBytes4(0) != 0xa04a0908) {
            // execute(address,bytes,uint256)
            revert("unexpected function call");
        }

        (address _to, bytes memory _data, uint256 _value) = abi.decode(data.slice(4, data.length - 4), (address, bytes, uint256));

        (bool isRequireToken, address requiredToken, uint256 requiredAmount) = IBudgetApproval(budgetApproval).getRequiredAmount(_to, _data, _value);
        if(isRequireToken) {
            _burnTokenForAllMembers(requiredToken, requiredAmount);
            if(requiredToken == ETH_ADDRESS) {
                // ETH
                payable(budgetApproval).transfer(requiredAmount);
            } else {
                // ERC20
                IERC20(requiredToken).transfer(budgetApproval, requiredAmount);
            }
        }

        (bool success, bytes memory results) = budgetApproval.call(data);
        require(success == true, "execution failed");

        (bool haveTokenUsed, address tokenUsed, uint256 usedAmount, bool haveTokenGot, address tokenGot, uint256 gotAmount) = abi.decode(results, (bool,address,uint256,bool,address,uint256));

        if(haveTokenUsed) {
            if(tokenUsed != requiredToken) {
                revert("unexpected token used");
            }

            if(usedAmount != requiredAmount) {
                //TODO: when Unsiwap BA
            }
        }

        if(haveTokenGot) {
            //TODO: when Unsiwap BA
        }
    }

    function getMintedContracts() external view override returns (address[] memory) {
        return _mintedContracts;
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

    function _burnTokenForAllMembers(address _token, uint256 _totalAmount) private {
        address[] memory members = IMembership(membership).getAllMembers();
        
        uint256 totalBalance;
        uint256 amountLeft = _totalAmount;
        for(uint i = 0; i<members.length; i++) {
            totalBalance += balanceOf(members[i], _tokenId(_token));
        }

        for(uint i = 0; i < members.length - 1; i++) {
            uint256 memberBalance = balanceOf(members[i], _tokenId(_token));
            _burnToken(
                members[i],
                _tokenId(_token),
                _totalAmount * memberBalance / totalBalance
            );

            amountLeft -= _totalAmount * memberBalance / totalBalance;
        }

        _burnToken(
            members[members.length - 1],
            _tokenId(_token),
            amountLeft
        );
        
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