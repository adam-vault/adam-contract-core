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
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IMultiToken.sol";
import "./interface/IGovernFactory.sol";
import "./interface/ICommonBudgetApproval.sol";
import "./interface/IMemberToken.sol";
import "./interface/IDao.sol";

import "./lib/Concat.sol";
import "./lib/ToString.sol";
import "./lib/BytesLib.sol";
import "./dex/UniswapSwapper.sol";
import "hardhat/console.sol";

contract Dao is Initializable, UUPSUpgradeable, ERC721HolderUpgradeable, ERC1155Holder {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Concat for string;
    using BytesLib for bytes;

    address constant public ETH_ADDRESS = address(0x0);

    Counters.Counter private _ERC20tokenIds;

    address public memberToken;
    address public creator;
    address public adam;
    address public membership;
    address public multiToken;
    address public governFactory;
    address public memberTokenImplementation;
    string public name;
    mapping(address => bool) public budgetApprovals;
    mapping(address => uint256) public firstDeposit;

    uint256 public locktime;
    uint256 public minDepositAmount;
    uint256 public minMemberTokenToJoin;
    mapping(address => bool) public allowDepositTokens;

    enum VoteType {
        Membership,
        MemberToken,
        Other
    }

    event SwapToken(address portfolio, uint256 src, uint256 dst, uint256 srcAmount, uint256 dstAmount);
    event CreateBudgetApproval(address budgetApproval, bytes data);
    event Deposit(address member, address token, uint256 amount);
    event Redeem(address member, address token, uint256 amount);
    event AllowDepositToken(address[] token);
    event CreateMemberToken(address creator, address token);

    function initialize(
        IDao.InitializeParams calldata params
    ) public initializer {
        __ERC721Holder_init();

        adam = msg.sender;
        creator = params._creator;
        membership = params._membership;
        multiToken = params._multiToken;
        name = params._name;
        locktime = params._locktime;
        governFactory = params._governFactory;
        memberTokenImplementation = params._memberTokenImplementation;
        minDepositAmount = params.daoSetting.minDepositAmount;
        minMemberTokenToJoin = params.daoSetting.minMemberTokenToJoin;

        if (params.isCreateToken) {
            // tokenInfo: [name, symbol]
            _createMemberToken(params.tokenInfo, params.tokenAmount);
        }

        uint256[] memory w = new uint256[](1);
        w[0] = 1;
        // CAUTION: if later on support create govern with multi token, also need to add VoteType
        _createGovern("BudgetApproval", params.budgetApproval[0], params.budgetApproval[1], params.budgetApproval[2], w, params.budgetApproval[3]);
        _createGovern("RevokeBudgetApproval", params.revokeBudgetApproval[0], params.revokeBudgetApproval[1], params.revokeBudgetApproval[2], w, params.revokeBudgetApproval[3]);
        _createGovern("General", params.general[0], params.general[1], params.general[2], w, params.revokeBudgetApproval[3]);
        
        // TODO: confirm govern naming and setting
        _createGovern("DaoSetting", params.daoSettingApproval[0], params.daoSettingApproval[1], params.daoSettingApproval[2], w, params.daoSettingApproval[3]);

        _deposit(params._creator, 0);
    }

    modifier govern(string memory category) {
        require(
            (IMembership(membership).totalSupply() == 1 && IMembership(membership).ownerToTokenId(msg.sender) != 0)
                // for create member token, dao become one of the member
                || IMembership(membership).totalSupply() == 2 && IMembership(membership).ownerToTokenId(msg.sender) != 0 && address(memberToken) != address(0)
                || msg.sender == IGovernFactory(governFactory).governMap(address(this), category),
            string("Dao: only ").concat(category));
        _;
    }

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender], "access denied");
        _;
    }

    function createMemberToken(string[] calldata tokenInfo, uint tokenAmount) public govern("DaoSetting") {
        _createMemberToken(tokenInfo, tokenAmount);
    }

    function _createMemberToken(string[] calldata tokenInfo, uint tokenAmount) internal {
        require(memberToken == address(0), "Member token already initialized");
        require(tokenInfo.length == 2, "Insufficient info to create member token");

        ERC1967Proxy _memberToken = new ERC1967Proxy(memberTokenImplementation, "");
        memberToken = address(_memberToken);
        IMemberToken(memberToken).initialize(address(this), tokenInfo[0], tokenInfo[1]);
        IMultiToken(multiToken).mintToken(_member(address(this)), _tokenId(memberToken), tokenAmount, "");

        _mintMemberToken(tokenAmount);

        emit CreateMemberToken(msg.sender, memberToken);
    }

    function mintMemberToken(uint amount) public govern("BudgetApproval") {
        _mintMemberToken(amount);
    }

    function _mintMemberToken(uint amount) internal {
        IMemberToken(address(memberToken)).mint(address(this), amount);
    }

    function transferMemberToken(address to, uint amount) public govern("BudgetApproval") {
        _transferMemberToken(to, amount);
    }

    function _transferMemberToken(address to, uint amount) internal {
        IMemberToken(address(memberToken)).transfer(to, amount);
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
    function approveERC20(address _token, address _to, uint256 _amount) public {
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

    function _deposit(address owner, uint256 amount) private {
        address member = _member(owner);
        IMultiToken(multiToken).mintToken(member, _tokenId(address(0)), amount, "");

        emit Deposit(member, address(0), amount);

        if (firstDeposit[member] == 0) {
            firstDeposit[member] = block.timestamp;

            require(amount >= minDepositAmount, "deposit amount not enough");

            if(memberToken != address(0x0)) {
                require(IERC20(memberToken).balanceOf(owner) >= minMemberTokenToJoin, "member token not enough");
            }
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
            console.logUint(_amounts[i]);
            IMultiToken(multiToken).burnToken(_members[i], _tokenId(_token), _amounts[i]);
            totalAmount += _amounts[i];
        }

        if(!transferred) {
            if(_token == ETH_ADDRESS) {
                // ETH
                payable(msg.sender).transfer(totalAmount);
            } else {
                // ERC20
                console.log("====withdraw=====");
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

    function updateDaoSetting(IDao.DaoSetting calldata _setting) public govern("DaoSetting") {
        minDepositAmount = _setting.minDepositAmount;
        minMemberTokenToJoin = _setting.minMemberTokenToJoin;
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
        uint voteToken
    ) public govern("Govern") {
        _createGovern(
            _name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            voteToken
        );
    }

    function getVoteTypeValues(VoteType voteType) internal view returns (address[] memory) {
        if (VoteType.Membership == voteType) {
            if (address(membership) == address(0)) {
                revert("Membership not yet initialized");
            }

            address[] memory values = new address[](1);
            values[0] = address(membership);
            return values;
        }

        if (VoteType.MemberToken == voteType) {
            if (address(memberToken) == address(0)) {
                revert("MemberToken not yet initialized");
            }

            address[] memory values = new address[](1);
            values[0] = address(memberToken);
            return values;
        }

        if (VoteType.Other == voteType) {
            // TODO: Other tokens e.g. outside ERC721 Votes
        }

        revert("Unsupported Token type");
    }

    function _createGovern(
        string memory _name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] memory voteWeights,
        uint voteToken
    ) internal {
        address[] memory _voteTokens = getVoteTypeValues(VoteType(voteToken));
        IGovernFactory(governFactory).createGovern(
            _name,
            duration,
            quorum,
            passThreshold,
            voteWeights,
            _voteTokens
        );
    }

    function _authorizeUpgrade(address newImplementation) internal override {}

    receive() external payable {}
}