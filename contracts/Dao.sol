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
import "./interface/ICommonBudgetApproval.sol";

import "./base/MultiToken.sol";
import "./lib/Concat.sol";
import "./lib/ToString.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";
import "hardhat/console.sol";

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

    uint256 public locktime;
    mapping(address => bool) public allowDepositTokens;

    event SwapToken(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event Deposit(address member, address token, uint256 amount);
    event Redeem(address member, address token, uint256 amount);
    event AllowDepositToken(address[] token);

    function initialize(
        address _adam,
        address _creator,
        string calldata _name,
        address _membership,
        uint256 _locktime,
        address _governFactory,
        uint256[3] calldata budgetApproval,
        uint256[3] calldata revokeBudgetApproval,
        uint256[3] calldata general

    ) public initializer {
        __ERC721Holder_init();
        __MultiToken_init(_name, "");

        adam = _adam;
        creator = _creator;
        membership = _membership;
        locktime = _locktime;
        governFactory = _governFactory;

        address[] memory t = new address[](1);
        t[0] = _membership;

        uint256[] memory w = new uint256[](1);
        w[0] = 1;

        _createGovern("BudgetApproval", budgetApproval[0], budgetApproval[1], budgetApproval[2], w, t);
        _createGovern("RevokeBudgetApproval", revokeBudgetApproval[0], revokeBudgetApproval[1], revokeBudgetApproval[2], w, t);
        _createGovern("General", general[0], general[1], general[2], w, t);

        _deposit(_creator, 0);
    }

    modifier govern(string memory category) {
        require(
            (IMembership(membership).totalSupply() == 1 && IMembership(membership).ownerToTokenId(msg.sender) != 0)
                || msg.sender == IGovernFactory(governFactory).governMap(address(this), category),
            string("Dao: only").concat(category));
        _;
    }

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender] == true, "access denied");
        _;
    }

    function createBudgetApprovals(address[] calldata _budgetApprovals, bytes[] calldata data) public govern("BudgetApproval") {
        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(IAdam(adam).budgetApprovalRegistry(_budgetApprovals[i]), "not whitelist");
            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);
        }
    }

    // for handling Uniswap Iframe
    function approveERC20(address _token, address _to, uint256 _amount) public onlyBudgetApproval {
        IERC20(_token).approve(_to,_amount);
    }

    function createBudgetApprovalTransaction (address _budgetApproval, bytes calldata _data, uint256 _deadline) external {
        require(budgetApprovals[_budgetApproval] == true, "budget approval invalid");
        require(ICommonBudgetApproval(_budgetApproval).supportsInterface(_data.toBytes4(0)) == true, "not supported interface");
    
        ICommonBudgetApproval(_budgetApproval).createTransaction(_data, _deadline);
    }

    function getMintedContracts() external view returns (address[] memory) {
        return _mintedContracts;
    }

    function deposit() public payable {
        _deposit(msg.sender, msg.value);
    }

    function _deposit(address owner, uint256 amount) public payable {
        address member = _member(owner);
        _mintToken(member, _tokenId(address(0)), amount, "");

        emit Deposit(member, address(0), amount);

        if (firstDeposit[member] == 0) {
            firstDeposit[member] = block.timestamp;
        }
    }

    function redeem(uint256 _amount) public {
        uint256 membershipId = IMembership(membership).ownerToTokenId(msg.sender);
        require(membershipId != 0, "no membership");

        address member = IMembership(membership).tokenIdToMember(membershipId);
        require(firstDeposit[member] + locktime <= block.timestamp, "lockup time");
        require(_amount <= balanceOf(member, ethId), "too big");

        _burnToken(member, ethId, _amount);
        payable(msg.sender).transfer(_amount);
        emit Redeem(member, address(0), _amount);
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
    ) public govern("Govern") {
        _createGovern(
            name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );
    }

    function _createGovern(
        string memory name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] memory voteWeights,
        address[] memory voteTokens
    ) internal {
        IGovernFactory(governFactory).createGovern(
            address(this),
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