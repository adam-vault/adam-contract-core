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
import "./interface/IGovernFactory.sol";
import "./interface/IBudgetApproval.sol";

import "./base/MultiToken.sol";
import "./lib/Concat.sol";
import "./lib/ToString.sol";
import "./lib/BytesLib.sol";
import "./lib/SharedStruct.sol";
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
    address public governFactory;
    mapping(address => bool) public budgetApprovals;
    mapping(address => uint256) public firstDeposit;

    DaoConfig public config;

    event SwapToken(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event Deposit(address member, address token, uint256 amount);
    event Redeem(address member, address token, uint256 amount);

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

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender] == true, "access denied");
        _;
    }

    function setGovernFactory(address _governFactory) external {
        governFactory = _governFactory;
    }

    function getTokenId(address _token) public view returns (uint256) {
        return addressToId[_token];
    }

    function setName(string calldata _name) public vote("CorporateAction") {
        name = _name;
    }

    function createBudgetApprovals(address[] calldata _budgetApprovals, bytes[] calldata data) public {

        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(IAdam(adam).budgetApprovalRegistry(_budgetApprovals[i]), "budget approval not whitelist");
            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);
        }
    }

    // for handling Uniswap Iframe
    function approveERC20(address _token, address _to, uint256 _amount) external onlyBudgetApproval {
        IERC20(_token).approve(_to,_amount);
    }

    function executeTransactionByBudgetApprovals (address budgetApproval, bytes calldata data) public {

        if(data.toBytes4(0) != 0xa04a0908) {
            // execute(address,bytes,uint256)
            revert("unexpected function call");
        }

        (bool success,) = budgetApproval.call(data);
        require(success == true, "execution failed");

    }

    function getMintedContracts() external view returns (address[] memory) {
        return _mintedContracts;
    }

    function deposit() public payable {
        require(msg.value > 0, "0 ether");
        require(config.depositTokens[address(0)] || config.allowAllTokens, "not allow");

        address member = _member(msg.sender);
        _mintToken(member, _tokenId(address(0)), msg.value, "");

        emit Deposit(member, address(0), msg.value);

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
        emit Redeem(member, address(0), _amount);
    }

    function depositToken(address _token, uint256 _amount) public {
        require(config.depositTokens[_token] || config.allowAllTokens, "not allow");
        require(IERC20Metadata(_token).allowance(msg.sender, address(this)) >= _amount, "allowance not enough");
        address member = _member(msg.sender);
        IERC20Metadata(_token).transferFrom(msg.sender, address(this), _amount);
        _mintToken(member, _tokenId(_token), _amount, "");

        emit Deposit(member, _token, _amount);

        if (firstDeposit[member] == 0) {
            firstDeposit[member] = block.timestamp;
        }
    }

    function withdrawByBudgetApproval(
        address _token, 
        address[] memory _members, 
        uint256[] memory _amounts, 
        bool transferred
    ) external onlyBudgetApproval returns (uint256 totalAmount) {
        require(_members.length == _amounts.length, "invalid input");

        for(uint i = 0; i < _members.length; i++) {
            _burnToken(_members[i], _tokenId(_token), _amounts[i]);
            totalAmount += _amounts[i];
        }

        if(!transferred) {
            if(_token == ETH_ADDRESS) {
                // ETH
                payable(msg.sender).transfer(totalAmount);
            } else {
                // ERC20
                IERC20(_token).transfer(msg.sender, totalAmount);
            }
        }
    }

    function depositByBudgetApproval(
        address _token, 
        address[] memory _members, 
        uint256[] memory _amounts, 
        bool transferred
    ) external payable onlyBudgetApproval returns (uint256 totalAmount) {
        require(_members.length == _amounts.length, "invalid input");

        for(uint i = 0; i < _members.length; i++) {
            _mintToken(_members[i], _tokenId(_token), _amounts[i], "");
            totalAmount += _amounts[i];
        }

        if(!transferred) {
            if(_token == ETH_ADDRESS) {
                require(msg.value == totalAmount, "amount invalid");
            } else {
                // ERC20
                require(IERC20(_token).allowance(msg.sender, address(this)) >= totalAmount,"not approved");
                IERC20(_token).transferFrom(msg.sender, address(this), totalAmount);
            }
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

        emit Redeem(member, _token, _amount);
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

    function createGovern(
        string calldata name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) public {
        IGovernFactory(governFactory).createGovern(
            name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override {}

}