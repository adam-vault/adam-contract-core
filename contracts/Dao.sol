// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./base/BudgetApprovalExecutee.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IOptInPool.sol";
import "./interface/IGovernFactory.sol";
import "./interface/IMemberToken.sol";
import "./interface/IBudgetApprovalExecutee.sol";

import "./lib/Concat.sol";

contract Dao is Initializable, UUPSUpgradeable, ERC721HolderUpgradeable, ERC1155HolderUpgradeable, BudgetApprovalExecutee {
    using Concat for string;

    struct InitializeParams {
        address _creator;
        address _membership;
        address _liquidPool;
        address _depositPool;
        address _governFactory;
        address _memberTokenImplementation;
        address _optInPoolImplementation;
        string _name;
        string _description;
        uint256 _locktime;
        uint8 memberTokenType;
        address memberToken;
        uint256[4] budgetApproval;
        uint256[4] revokeBudgetApproval;
        uint256[4] general;
        uint256[4] daoSettingApproval;
        string[] tokenInfo;
        uint256 tokenAmount;
        DaoSetting daoSetting;
        address[] depositTokens;
    }

    struct DaoSetting {
        uint256 minDepositAmount;
        uint256 minMemberTokenToJoin;
    }

    enum MemberTokenTypeOption {
        NotInUsed,
        InternalErc20Token,
        ExternalErc721Token
    }

    enum VoteType {
        Membership,
        MemberToken,
        Other
    }

    address public memberToken;
    address public creator;
    address public adam;
    address public membership;
    address public liquidPool;
    address public depositPool;
    address public governFactory;
    address public memberTokenImplementation;
    address public optInPoolImplementation;
    string public name;
    uint256 public locktime;
    uint256 public minDepositAmount;
    uint256 public minMemberTokenToJoin;
    uint8 public memberTokenType;
    mapping(address => uint256) public firstDepositTime;
    mapping(address => bool) public isAssetSupported;

    event CreateBudgetApproval(address budgetApproval, bytes data);
    event CreateOptInPool(address optInPool);
    event AllowDepositToken(address token);
    event CreateMemberToken(address creator, address token);
    event SetFirstDepositTime(address owner, uint256 time);

    function initialize(InitializeParams calldata params) public initializer {
        adam = msg.sender;
        creator = params._creator;
        membership = params._membership;
        liquidPool = params._liquidPool;
        depositPool = params._depositPool;
        name = params._name;
        locktime = params._locktime;
        governFactory = params._governFactory;
        memberTokenImplementation = params._memberTokenImplementation;
        optInPoolImplementation = params._optInPoolImplementation;
        minDepositAmount = params.daoSetting.minDepositAmount;
        minMemberTokenToJoin = params.daoSetting.minMemberTokenToJoin;
        memberTokenType = params.memberTokenType;
        memberToken = params.memberToken;

        if (memberTokenType == uint8(MemberTokenTypeOption.InternalErc20Token)) {
            // tokenInfo: [name, symbol]
            _createMemberToken(params.tokenInfo, params.tokenAmount);
        } else if(memberTokenType == uint8(MemberTokenTypeOption.ExternalErc721Token)) {

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
        _createGovern(
            "BudgetApproval",
            params.budgetApproval[0],
            params.budgetApproval[1],
            params.budgetApproval[2],
            w,
            params.budgetApproval[3]
        );
        _createGovern(
            "RevokeBudgetApproval",
            params.revokeBudgetApproval[0],
            params.revokeBudgetApproval[1],
            params.revokeBudgetApproval[2],
            w,
            params.revokeBudgetApproval[3]
        );
        _createGovern(
            "General",
            params.general[0],
            params.general[1],
            params.general[2],
            w,
            params.revokeBudgetApproval[3]
        );
        _createGovern(
            "DaoSetting",
            params.daoSettingApproval[0],
            params.daoSettingApproval[1],
            params.daoSettingApproval[2],
            w,
            params.daoSettingApproval[3]
        );

        _mintMember(creator);
        _addAssets(params.depositTokens);

    }

    modifier onlyGovern(string memory category) {
        require(
            byPassGovern(msg.sender) || msg.sender == govern(category),
            string("Dao: only Govern ").concat(category));
        _;
    }

    // to be removed in future
    modifier onlyGovernOrSelf(string memory category) {
        require(
            byPassGovern(msg.sender) || msg.sender == govern(category) || msg.sender == address(this),
            string("Dao: only Govern ").concat(category));
        _;
    }

    function setFirstDepositTime(address owner) public {
        require(msg.sender == liquidPool, "only LP");
        firstDepositTime[owner] = block.timestamp;
        emit SetFirstDepositTime(owner, block.timestamp);
    }

    function mintMemberToken(uint amount) public onlyGovern("BudgetApproval") {
        _mintMemberToken(amount);
    }

    function transferMemberToken(address to, uint amount) public onlyGovern("BudgetApproval") {
        _transferMemberToken(to, amount);
    }

    function createMultiExecuteeBudgetApprovals(address[] calldata executee, address[] calldata budgetApprovals, bytes[] calldata data) public onlyGovern("BudgetApproval") {
        require(executee.length == data.length, "input invalid");
        require(budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < data.length; i++) {
            address[] memory currentBudgetApproval = new address[](1);
            bytes[] memory currentData = new bytes[](1);
            currentBudgetApproval[0] = budgetApprovals[i];
            currentData[0] = data[i];
            IBudgetApprovalExecutee(executee[i]).createBudgetApprovals(currentBudgetApproval, currentData);
        }
    }

    function createBudgetApprovals(address[] calldata _budgetApprovals, bytes[] calldata data) public onlyGovernOrSelf("BudgetApproval") {
        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(canCreateBudgetApproval(_budgetApprovals[i]), "not whitelist");
            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);
        }
    }


    function createOptInPool(
        address _depositToken,
        uint256 _depositThreshold,
        uint256 _depositDeadline,
        address[] memory _redeemTokens,
        uint256 _redeemTime,
        address[] memory _budgetApprovals,
        bytes[] memory _budgetApprovalsData
    ) public {

        ERC1967Proxy _optInPool = new ERC1967Proxy(optInPoolImplementation, "");
        IOptInPool(payable(address(_optInPool))).initialize(
            depositPool,
            _depositToken,
            _depositThreshold,
            _depositDeadline,
            _redeemTokens,
            _redeemTime,
            _budgetApprovals,
            _budgetApprovalsData
        );
        emit CreateOptInPool(address(_optInPool));
    }

    function canCreateBudgetApproval(address budgetApproval) public view returns (bool) {
        return IAdam(adam).budgetApprovals(budgetApproval);
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

    function updateDaoSetting(DaoSetting calldata _setting) public onlyGovern("DaoSetting") {
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
    function _addAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            _addAsset(erc20s[i]);
        }
    }
    function _addAsset(address erc20) internal {
        isAssetSupported[erc20] = true;
        emit AllowDepositToken(erc20);
    }
    function _mintMember(address owner) internal {
        IMembership(membership).createMember(owner);
    }
    function _authorizeUpgrade(address newImplementation) internal override {}

    receive() external payable {}
}