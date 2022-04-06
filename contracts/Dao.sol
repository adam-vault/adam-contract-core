// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IMultiToken.sol";
import "./interface/IGovernFactory.sol";
import "./interface/ICommonBudgetApproval.sol";

import "./lib/Concat.sol";
import "./lib/ToString.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";
import "hardhat/console.sol";

contract Dao is Initializable, UUPSUpgradeable, ERC721HolderUpgradeable {
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
    address public multiToken;
    address public governFactory;
    string public name;
    mapping(address => bool) public budgetApprovals;
    mapping(address => uint256) public firstDeposit;

    uint256 public locktime;
    mapping(address => bool) public allowDepositTokens;

    event SwapToken(address portfolio, uint256 src, uint256 dst, uint256 srcAmount, uint256 dstAmount);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event Deposit(address member, address token, uint256 amount);
    event Redeem(address member, address token, uint256 amount);
    event AllowDepositToken(address[] token);

    function initialize(
        address _creator,
        string calldata _name,
        address _membership,
        address _multiToken,
        uint256 _locktime,
        address _governFactory,
        uint256[3] calldata budgetApproval,
        uint256[3] calldata revokeBudgetApproval,
        uint256[3] calldata general

    ) public initializer {
        __ERC721Holder_init();

        adam = msg.sender;
        creator = _creator;
        membership = _membership;
        multiToken = _multiToken;
        name = _name;
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
        require(budgetApprovals[msg.sender], "access denied");
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

    function createBudgetApprovalTransaction (address _budgetApproval, bytes calldata _data, uint256 _deadline, bool _execute) external {
        require(budgetApprovals[_budgetApproval], "budget approval invalid");
        require(ICommonBudgetApproval(_budgetApproval).supportsInterface(_data.toBytes4(0)), "not supported interface");
    
        ICommonBudgetApproval(_budgetApproval).createTransaction(_data, _deadline, _execute);
    }

    function getMintedContracts() external view returns (address[] memory) {
        return IMultiToken(multiToken).mintedContracts();
    }

    function deposit() public payable {
        _deposit(msg.sender, msg.value);
    }

    function _deposit(address owner, uint256 amount) public payable {
        address member = _member(owner);
        IMultiToken(multiToken).mintToken(member, _tokenId(address(0)), amount, "");

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
        require(_amount <= IMultiToken(multiToken).balanceOf(member, IMultiToken(multiToken).ethId()), "too big");

        IMultiToken(multiToken).burnToken(member, IMultiToken(multiToken).ethId(), _amount);
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
            IMultiToken(multiToken).burnToken(_members[i], _tokenId(_token), _amounts[i]);
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
            IMultiToken(multiToken).mintToken(_members[i], _tokenId(_token), _amounts[i], "");
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
        if (IMultiToken(multiToken).addressToId(contractAddress) == 0) {
            IMultiToken(multiToken).createToken(contractAddress);
        }
        return IMultiToken(multiToken).addressToId(contractAddress);
    }


    function _member(address owner) internal returns (address) {
        uint256 memberTokenId = IMembership(membership).ownerToTokenId(owner);
        if (memberTokenId == 0) {
            (memberTokenId,) = IMembership(membership).createMember(owner);
        }
        return IMembership(membership).tokenIdToMember(memberTokenId);
    }

    function createGovern(
        string calldata _name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        address[] calldata voteTokens
    ) public govern("Govern") {
        _createGovern(
            _name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );
    }

    function _createGovern(
        string memory _name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] memory voteWeights,
        address[] memory voteTokens
    ) internal {
        IGovernFactory(governFactory).createGovern(
            _name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteTokens
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override {}

    receive() external payable {}
}