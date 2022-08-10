// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./base/BudgetApprovalExecutee.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IGovernFactory.sol";
import "./interface/IMemberToken.sol";
import "./interface/IBudgetApprovalExecutee.sol";
import "./interface/ITeam.sol";

import "./lib/Concat.sol";

contract Dao is Initializable, UUPSUpgradeable, ERC721HolderUpgradeable, ERC1155HolderUpgradeable, BudgetApprovalExecutee {
    using Concat for string;
    using Address for address;
    
    struct InitializeParams {
        address _creator;
        address _membership;
        address _liquidPool;
        address _governFactory;
        address _team;
        address _memberTokenImplementation;
        string _name;
        string _description;
        uint256 _locktime;
        uint256[4] generalGovernSetting;
        string[] tokenInfo;
        uint256 tokenAmount;
        DaoSetting daoSetting;
        address[] depositTokens;
        bool mintMemberToken;
        AdmissionToken[3] admissionTokens;
        address baseCurrency;
        string logoCID;
    }

    struct AdmissionToken {
        address token;
        uint256 minTokenToAdmit;
        uint256 tokenId;
        bool isMemberToken;
    }

    struct AdmissionTokenSetting{
        uint256 minTokenToAdmit;
        uint256 tokenId;
    }

    struct DaoSetting {
        uint256 minDepositAmount;
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
    address public governFactory;
    address public memberTokenImplementation;
    string public name;
    uint256 public locktime;
    uint256 public minDepositAmount;
    address public baseCurrency;
    string public logoCID;
    address[] public admissionTokens;
    
    mapping(address => uint256) public firstDepositTime;
    mapping(address => bool) public isAssetSupported;
    mapping(uint256 => bool) public teamWhitelist;
    mapping(address => AdmissionTokenSetting) public admissionTokenSetting;

    event AllowDepositToken(address token);
    event CreateMemberToken(address creator, address token);
    event SetFirstDepositTime(address owner, uint256 time);
    event WhitelistTeam(uint256 tokenId);

    function initialize(InitializeParams calldata params) public initializer {
        adam = msg.sender;
        creator = params._creator;
        membership = params._membership;
        liquidPool = params._liquidPool;
        name = params._name;
        locktime = params._locktime;
        governFactory = params._governFactory;
        team = params._team;
        memberTokenImplementation = params._memberTokenImplementation;
        minDepositAmount = params.daoSetting.minDepositAmount;
        baseCurrency = params.baseCurrency;
        logoCID = params.logoCID;

        if (params.mintMemberToken) {
            // tokenInfo: [name, symbol]
            _createMemberToken(params.tokenInfo, params.tokenAmount);
        }

        uint256[] memory w = new uint256[](1);
        w[0] = 1;
        // CAUTION: if later on support create govern with multi token, also need to add VoteType
        _createGovern(
            "General",
            params.generalGovernSetting[0],
            params.generalGovernSetting[1],
            params.generalGovernSetting[2],
            w,
            params.generalGovernSetting[3]
        );

        _setAdmissionToken(params.admissionTokens);
        _mintMember(creator);
        _addAssets(params.depositTokens);

    }

    modifier onlyGovern(string memory category) {
        require(
            byPassGovern(msg.sender) || msg.sender == govern(category), "Action not permitted");
        _;
    }

    function setFirstDepositTime(address owner) public {
        require(msg.sender == liquidPool, "only LP");
        firstDepositTime[owner] = block.timestamp;
        emit SetFirstDepositTime(owner, block.timestamp);
    }

    function mintMemberToken(uint amount) public onlyGovern("General") {
        _mintMemberToken(amount);
    }

    function transferMemberToken(address to, uint amount) public onlyGovern("General") {
        _transferMemberToken(to, amount);
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovern("General") {
        require(canCreateBudgetApproval(budgetApproval), "Budget Implementation not whitelisted");
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

    function updateDaoSetting(DaoSetting calldata _setting) public onlyGovern("General") {
        minDepositAmount = _setting.minDepositAmount;
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

    function addAssets(address[] calldata erc20s) public onlyGovern("General") {
        _addAssets(erc20s);
    }
    function mintMember(address owner) public {
        require(msg.sender == liquidPool, "only LP");
        _mintMember(owner);
    }

    function createTeam(string memory title, address minter, address[] memory members, string memory description) public onlyGovern("General") {
      uint256 id = ITeam(team).addTeam(title, minter, members, description);
      teamWhitelist[id] = true;

      emit WhitelistTeam(id);
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

    function _setAdmissionToken( AdmissionToken[3] memory _admissionTokens) internal {
        require(admissionTokens.length <= 3, "Admission Token length too long." );

        for(uint i = 0 ; i < _admissionTokens.length ; i++){
            address tokenAddress = _admissionTokens[i].isMemberToken ? memberToken : _admissionTokens[i].token;
            require(tokenAddress.isContract(), "Admission Token not Support!");

            admissionTokens.push(tokenAddress);
            admissionTokenSetting[tokenAddress] = AdmissionTokenSetting(
                _admissionTokens[i].minTokenToAdmit,
                _admissionTokens[i].tokenId
            );
        }
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