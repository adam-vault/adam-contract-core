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
    using Strings for uint256;
    using Concat for string;
    using BytesLib for bytes;
    using Counters for Counters.Counter;

    address constant public ETH_ADDRESS = address(0x0);

    enum MemberTokenTypeOption {
        NotInUsed,
        InternalErc20Token,
        ExternalErc721Token
    }

    address public memberToken;
    address public creator;
    address public adam;
    address public membership;
    address public liquidPool;
    address public governFactory;
    address public memberTokenImplementation;
    string public name;
    mapping(address => bool) public budgetApprovals;
    mapping(address => uint256) public firstDeposit;

    uint256 public locktime;
    uint256 public minDepositAmount;
    uint256 public minMemberTokenToJoin;
    mapping(address => bool) public isAssetSupported;

    enum VoteType {
        Membership,
        MemberToken,
        Other
    }
    uint8 public memberTokenType;

    event CreateBudgetApproval(address budgetApproval, bytes data);
    event AllowDepositToken(address token);
    event CreateMemberToken(address creator, address token);

    function initialize(
        IDao.InitializeParams calldata params
    ) public initializer {
        __ERC721Holder_init();

        adam = msg.sender;
        creator = params._creator;
        membership = params._membership;
        liquidPool = params._liquidPool;
        name = params._name;
        locktime = params._locktime;
        governFactory = params._governFactory;
        memberTokenImplementation = params._memberTokenImplementation;
        minDepositAmount = params.daoSetting.minDepositAmount;
        minMemberTokenToJoin = params.daoSetting.minMemberTokenToJoin;
        memberTokenType = params.memberTokenType;
        memberToken = params.memberToken;

        if (memberTokenType == uint8(MemberTokenTypeOption.InternalErc20Token)) {
            // tokenInfo: [name, symbol]
            _createMemberToken(params.tokenInfo, params.tokenAmount);
        }else if(memberTokenType == uint8(MemberTokenTypeOption.ExternalErc721Token)) {

            try IERC721(params.memberToken).supportsInterface(0x80ac58cd) returns (bool result) {
                if(!result){ 
                    revert("Not ERC 721 standard");
                }
            } catch {
                revert("Not ERC 721 standard");
            }
            memberToken = params.memberToken;
        }

        uint256[] memory w = new uint256[](1);
        w[0] = 1;
        // CAUTION: if later on support create govern with multi token, also need to add VoteType
        _createGovern("BudgetApproval", params.budgetApproval[0], params.budgetApproval[1], params.budgetApproval[2], w, params.budgetApproval[3]);
        _createGovern("RevokeBudgetApproval", params.revokeBudgetApproval[0], params.revokeBudgetApproval[1], params.revokeBudgetApproval[2], w, params.revokeBudgetApproval[3]);
        _createGovern("General", params.general[0], params.general[1], params.general[2], w, params.revokeBudgetApproval[3]);
        
        // TODO: confirm govern naming and setting
        _createGovern("DaoSetting", params.daoSettingApproval[0], params.daoSettingApproval[1], params.daoSettingApproval[2], w, params.daoSettingApproval[3]);

        _mintMember(creator);
        _addAssets(params.depositTokens);

    }

    modifier onlyGovern(string memory category) {
        require(
            byPassGovern(msg.sender) || msg.sender == govern(category),
            string("Dao: only ").concat(category));
        _;
    }

    modifier onlyBudgetApproval {
        require(budgetApprovals[msg.sender], "access denied");
        _;
    }

    function setFirstDeposit(address owner) public {
        require(msg.sender == liquidPool, "only LP");
        firstDeposit[owner] = block.timestamp;
    }

    function mintMemberToken(uint amount) public onlyGovern("BudgetApproval") {
        _mintMemberToken(amount);
    }

    function transferMemberToken(address to, uint amount) public onlyGovern("BudgetApproval") {
        _transferMemberToken(to, amount);
    }

    function createBudgetApprovals(address[] calldata _budgetApprovals, bytes[] calldata data) public onlyGovern("BudgetApproval") {
        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(canCreateBudgetApproval(_budgetApprovals[i]), "not whitelist");
            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);
        }
    }

    function canCreateBudgetApproval(address budgetApproval) public view returns (bool) {
        return IAdam(adam).budgetApprovalRegistry(budgetApproval);
    }

    function govern(string memory gName) public view returns (address) {
        return IGovernFactory(governFactory).governMap(address(this), gName);
    }

    function byPassGovern(address account) public view returns (bool) {
        return (IMembership(membership).totalSupply() == 1 && isMember(account));
    }

    function isMember(address account) public view returns (bool) {
        return IMembership(membership).isMember(account);
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

    function withdrawByBudgetApproval(
        address _token, 
        address[] memory _members, 
        uint256[] memory _amounts, 
        bool transferred
    ) external onlyBudgetApproval returns (uint256 totalAmount) {

    }

    function depositByBudgetApproval(
        address _token, 
        address[] memory _members, 
        uint256[] memory _amounts, 
        bool transferred
    ) external payable onlyBudgetApproval returns (uint256 totalAmount) {

    }

    function updateDaoSetting(IDao.DaoSetting calldata _setting) public onlyGovern("DaoSetting") {
        minDepositAmount = _setting.minDepositAmount;
        minMemberTokenToJoin = _setting.minMemberTokenToJoin;
    }

    function createGovern(
        string calldata _name,
        uint duration,
        uint quorum,
        uint passThreshold,
        uint[] calldata voteWeights,
        uint voteToken
    ) public onlyGovern("Govern") {
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

    function addAssets(address[] calldata erc20s) public onlyGovern("DaoSetting") {
        _addAssets(erc20s);
    }
    function mintMember(address owner) public {
        require(msg.sender == liquidPool, "only LP");
        _mintMember(owner);
    }

    function _createMemberToken(string[] calldata tokenInfo, uint tokenAmount) internal {
        require(memberToken == address(0), "Member token already initialized");
        require(tokenInfo.length == 2, "Insufficient info to create member token");

        ERC1967Proxy _memberToken = new ERC1967Proxy(memberTokenImplementation, "");
        memberToken = address(_memberToken);
        IMemberToken(memberToken).initialize(address(this), tokenInfo[0], tokenInfo[1]);
        _addAsset(memberToken);
        _mintMemberToken(tokenAmount);

        emit CreateMemberToken(msg.sender, memberToken);
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

    function _mintMemberToken(uint amount) internal {
        IMemberToken(address(memberToken)).mint(address(this), amount);
    }
    function _transferMemberToken(address to, uint amount) internal {
        IMemberToken(address(memberToken)).transfer(to, amount);
    }
    function _addAssets(address[] memory erc20s) public {
        for (uint256 i = 0; i < erc20s.length; i++) {
            isAssetSupported[erc20s[i]] = true;
        }
    }
    function _addAsset(address erc20) public {
        isAssetSupported[erc20] = true;
        emit AllowDepositToken(erc20);
    }
    function _mintMember(address owner) internal {
        IMembership(membership).createMember(owner);
    }
    function _authorizeUpgrade(address newImplementation) internal override {}

    receive() external payable {}
}