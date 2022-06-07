// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

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
    using Address for address;
    
    /** 
     * @notice initialize config of dao
     * @param _creator address creator of dao
     * @param _membership address of membership
     * @param _liquidPool address of liquidPool
     * @param _depositPool address of depositPool
     * @param _admissionToken address of admission token
     * @param _governFactory address of govern factory
     * @param _memberTokenImplementation address of member token implementation
     * @param _optInPoolImplementation address of opt in pool implementation
     * @param _name name of dao
     * @param _description description of dao
     * @param _locktime length of locktime
     * @param budgetApproval budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken
     * @param revokeBudgetApproval revoke budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken
     * @param general general govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken
     * @param daoSettingApproval dao setting govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken
     * @param tokenInfo [0]token name, [1]token symbol
     * @param tokenAmount mint member token amount
     * @param daoSetting updatable dao config
     * @param depositTokens address of tokens which is able to deposit
     * @param mintMemberToken to mint member token
     */
    struct InitializeParams {
        address _creator;
        address _membership;
        address _liquidPool;
        address _depositPool;
        address _admissionToken;
        address _governFactory;
        address _memberTokenImplementation;
        address _optInPoolImplementation;
        string _name;
        string _description;
        uint256 _locktime;
        uint256[4] budgetApproval;
        uint256[4] revokeBudgetApproval;
        uint256[4] general;
        uint256[4] daoSettingApproval;
        string[] tokenInfo;
        uint256 tokenAmount;
        DaoSetting daoSetting;
        address[] depositTokens;
        bool mintMemberToken;
    }

    /** 
     * @notice updatable dao config
     * @param minDepositAmount minimum deposit amount to join the dao
     * @param minMemberTokenToJoin minimum amount of member token to join the dao
     */
    struct DaoSetting {
        uint256 minDepositAmount;
        uint256 minTokenToAdmit;
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
    address public admissionToken;
    address public memberTokenImplementation;
    address public optInPoolImplementation;
    string public name;
    uint256 public locktime;
    uint256 public minDepositAmount;
    uint256 public minTokenToAdmit;
    
    mapping(address => uint256) public firstDepositTime;
    mapping(address => bool) public isAssetSupported;
    mapping(address => bool) public isOptInPool;

    event CreateOptInPool(address optInPool);
    event AllowDepositToken(address token);
    event CreateMemberToken(address creator, address token);
    event SetFirstDepositTime(address owner, uint256 time);

    /** 
     * @dev [0] _creator: address creator of dao \
     *      [1] _membership: address of membership \
     *      [2] _liquidPool: address of liquidPool \
     *      [3] _depositPool: address of depositPool \
     *      [4] _admissionToken: address of admission token \
     *      [5] _governFactory: address of govern factory \
     *      [6] _memberTokenImplementation: address of member token implementation \
     *      [7] _optInPoolImplementation: address of opt in pool implementation \
     *      [8] _name: name of dao \
     *      [9] _description: description of dao \
     *      [10] _locktime: length of locktime \
     *      [11] budgetApproval: budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     *      [12] revokeBudgetApproval: revoke budget approval govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     *      [13] general: general govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     *      [14] daoSettingApproval: dao setting govern config [0]duration, [1]quorum, [2]passThreshold, [3]voteToken \
     *      [15] tokenInfo: [0]token name, [1]token symbol \
     *      [16] tokenAmount: mint member token amount \
     *      [17] daoSetting: updatable dao config \
     *      [18] depositTokens: address of tokens which is able to deposit \
     *      [19] mintMemberToken: to mint member token
     * @param params see above
     */
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
        minTokenToAdmit = params.daoSetting.minTokenToAdmit;

        if (params.mintMemberToken) {
            // tokenInfo: [name, symbol]
            _createMemberToken(params.tokenInfo, params.tokenAmount);
        }

        if(params._admissionToken == address(0)){
            admissionToken = memberToken;
        }else{
            require(params._admissionToken.isContract(), "Admission Token not Support!");
            bytes4 sector = bytes4(keccak256("balanceOf(address)"));
            bytes memory data = abi.encodeWithSelector(sector, msg.sender);
            (bool success,) = params._admissionToken.call(data);
            require(success, "Admission Token not Support!");
            admissionToken = params._admissionToken;
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
        require(msg.sender == liquidPool || msg.sender == depositPool, "only LP or DP");
        firstDepositTime[owner] = block.timestamp;
        emit SetFirstDepositTime(owner, block.timestamp);
    }

    function mintMemberToken(uint amount) public onlyGovern("BudgetApproval") {
        _mintMemberToken(amount);
    }

    function transferMemberToken(address to, uint amount) public onlyGovern("BudgetApproval") {
        _transferMemberToken(to, amount);
    }

    /**
     * @notice create budget approvals for multiple executee (dao and liquid pool)
     * @param executee addresses of executee (dao/liquid pool)
     * @param budgetApprovals addresses of budget approval templates
     * @param data bytes of initialize data
     */
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

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovernOrSelf("BudgetApproval") {
        require(canCreateBudgetApproval(budgetApproval), "not whitelist");
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
        isOptInPool[address(_optInPool)] = true;
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
        minTokenToAdmit = _setting.minTokenToAdmit;
    }

    /**
     * @notice create a govern for proposal
     * @param _name govern name
     * @param duration how long the proposal last
     * @param quorum minimum percentage of total vote to pass the proposal (100% = 10000)
     * @param passThreshold minimum percentage of for vote to pass the proposal (100% = 10000)
     * @param voteWeights weights of token
     * @param voteToken token to vote
     */
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
        require(msg.sender == liquidPool || msg.sender == depositPool, "only LP or DP");
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