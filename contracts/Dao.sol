// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./base/BudgetApprovalExecutee.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IGovernFactory.sol";
import "./interface/IMemberToken.sol";
import "./interface/ITeam.sol";
import "./interface/ILiquidPool.sol";

import "./lib/Concat.sol";
import "./lib/Constant.sol";

import "./lib/InterfaceChecker.sol";
import "./lib/ToString.sol";
import "./lib/RevertMsg.sol";

interface IInbox {
    function createRetryableTicket(
        address destAddr,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        address excessFeeRefundAddress,
        address callValueRefundAddress,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) external payable returns (uint256);
}

contract Dao is Initializable, UUPSUpgradeable, ERC721HolderUpgradeable, ERC1155HolderUpgradeable, BudgetApprovalExecutee {
    using Concat for string;
    using AddressUpgradeable for address;
    using InterfaceChecker for address;

    struct InitializeParams {
        address _creator;
        address _membership;
        address _liquidPool;
        address _governFactory;
        address _team;
        address _memberTokenImplementation;
        string _name;
        string _description;
        address baseCurrency;
        string _memberTokenName;
        string _memberTokenSymbol;
        address[] depositTokens;
    }

    struct AdmissionTokenSetting{
        uint256 minTokenToAdmit;
        uint256 tokenId;
        bool active;
    }

    enum VoteType {
        Membership,
        MemberToken,
        ExistingToken
    }

    address public memberToken;
    address public creator;
    address public adam;
    address public membership;
    address public liquidPool;
    address public governFactory;
    string public name;
    uint256 public locktime;
    uint256 public minDepositAmount;
    address public baseCurrency;
    string public logoCID;
    address[] public admissionTokens;
    bool private _initializing;

    mapping(address => uint256) public firstDepositTime;
    mapping(address => bool) public isAssetSupported;
    mapping(uint256 => bool) public teamWhitelist;
    mapping(address => AdmissionTokenSetting) public admissionTokenSetting;

    event AllowDepositToken(address token);
    event CreateMemberToken(address creator, address token);
    event SetFirstDepositTime(address owner, uint256 time);
    event WhitelistTeam(uint256 tokenId);
    event AddAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId, bool isMemberToken);
    event CreateMember(address account, uint256 depositAmount);
    event Deposit(address account, uint256 amount);
    event UpgradeDao(string remark);

    event RemoveAdmissionToken(address token);
    event UpdateLocktime(uint256 locktime);
    event UpdateMinDepositAmount(uint256 amount);
    event UpdateLogoCID(string logoCID);
    event MemberQuit(address member);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(InitializeParams memory params, bytes[] memory data) public initializer {
        require( 
            address(params._creator) != address(0)
            && address(params._membership) != address(0)
            && address(params._liquidPool) != address(0)
            && address(params._governFactory) != address(0)
            && address(params._team) != address(0)
            && address(params._memberTokenImplementation) != address(0)
            && address(params.baseCurrency) != address(0)
        , "Invaild Dao Setting");
        _initializing = true;

        ___BudgetApprovalExecutee_init(params._team);

        adam = msg.sender;
        name = params._name;
        creator = params._creator;
        membership = params._membership;
        liquidPool = params._liquidPool;
        governFactory = params._governFactory;
        baseCurrency = params.baseCurrency;
        _mintMember(params._creator);
        _createMemberToken(params._memberTokenImplementation, params._memberTokenName, params._memberTokenSymbol);
        _addAssets(params.depositTokens);

        for (uint256 i = 0; i< data.length; i++) {
            (bool success, bytes memory result) = address(this).call(data[i]);
            require(success, 
                string("init fail").concat(RevertMsg.ToString(result)));

        }
        _initializing = false;
    }
    

    modifier onlyGovern(string memory category) {
        require(
            byPassGovern(msg.sender) ||
            msg.sender == govern(category) ||
            _initializing, "Action not permitted");
        _;
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

    function admissionTokensLength() external view returns(uint256) {
        return admissionTokens.length;
    }

    function setFirstDepositTime(address owner) public {
        require(msg.sender == liquidPool, "only LP");
        firstDepositTime[owner] = block.timestamp;
        emit SetFirstDepositTime(owner, block.timestamp);
    }

    function transferMemberToken(address to, uint amount) public onlyGovern("General") {
        _transferMemberToken(to, amount);
    }

    function setLocktime(uint256 _locktime) public onlyGovern("General") {
        locktime = _locktime;
        emit UpdateLocktime(_locktime);
    }

    function setMinDepositAmount(uint256 _minDepositAmount) public onlyGovern("General") {
        minDepositAmount = _minDepositAmount;
        emit UpdateMinDepositAmount(_minDepositAmount);
    }

    function setLogoCID(string calldata _logoCID) public onlyGovern("General") {
        logoCID = _logoCID;
        emit UpdateLogoCID(_logoCID);
    }


    function mintMemberToken(uint amount) public onlyGovern("General") {
        _mintMemberToken(amount);
    }

    function createGovern(
        string calldata _name,
        uint256 duration,
        uint256 quorum,
        uint256 passThreshold,
        VoteType voteType,
        address externalVoteToken,
        uint256 durationInBlock
    ) public onlyGovern("General") {
        address _voteToken;

        if (voteType == VoteType.Membership) {
            address _membership = membership;
            require(_membership != address(0), "Membership not yet initialized");
            _voteToken = _membership;
        } else if (voteType ==  VoteType.MemberToken) {
            address _memberToken = memberToken;
            require(_memberToken != address(0), "MemberToken not yet initialized");
            _voteToken = _memberToken;
        } else if (voteType == VoteType.ExistingToken) {
            require(externalVoteToken != address(0), "Vote token not exist");
            _voteToken = externalVoteToken;
        }

        IGovernFactory(governFactory).createGovern(
            _name,
            duration,
            quorum,
            passThreshold,
            _voteToken,
            durationInBlock
        );
    }

    function setMemberTokenAsAdmissionToken(uint256 minTokenToAdmit) public onlyGovern("General") {
        address _memberToken = memberToken;
        _addAdmissionToken(_memberToken, minTokenToAdmit, 0);
        emit AddAdmissionToken(
            _memberToken,
            minTokenToAdmit,
            0,
            true
        );
    }

    function addAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId) public onlyGovern("General") {
        _addAdmissionToken(token, minTokenToAdmit, tokenId);
        emit AddAdmissionToken(
            token,
            minTokenToAdmit,
            tokenId,
            false
        );
    }

    function removeAdmissionToken(uint256 index) public onlyGovern("General") {
        require(admissionTokens.length > index, "index overflow");
        address token = admissionTokens[index];
        admissionTokenSetting[token].active = false;

        address lastEl = admissionTokens[admissionTokens.length - 1];
        admissionTokens[index] = lastEl;
        admissionTokens.pop();

        emit RemoveAdmissionToken(token);
    }

    function addAssets(address[] calldata erc20s) public onlyGovern("General") {
        _addAssets(erc20s);
    }

    function createTeam(string memory title, address minter, address[] memory members, string memory description) public onlyGovern("General") {
      uint256 id = ITeam(team()).addTeam(title, minter, members, description);
      teamWhitelist[id] = true;

      emit WhitelistTeam(id);
    }

    function _createMemberToken(address memberTokenImplementation, string memory _name, string memory _symbol) internal {
        require(memberToken == address(0), "Member token already initialized");

        ERC1967Proxy _memberTokenContract = new ERC1967Proxy(memberTokenImplementation, "");
        address _memberToken = address(_memberTokenContract);
        memberToken = _memberToken;
        IMemberToken(_memberToken).initialize(address(this), _name, _symbol);
        _addAsset(_memberToken);

        emit CreateMemberToken(msg.sender, _memberToken);
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

    function afterDeposit(address account, uint256 amount) external {
        require(msg.sender == liquidPool, "only LP");
        if (firstDepositTime[account] == 0) {
            setFirstDepositTime(account);
            require(amount >= minDepositAmount, "deposit amount not enough");
            
            if (isMember(account)) {
                return;
            }
            require(isPassAdmissionToken(account), "Admission token not enough");
            _mintMember(account);

            emit CreateMember(account, amount);
        }
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovern("General") {
        require(canCreateBudgetApproval(budgetApproval), "Budget Implementation not whitelisted");
    }

    function _beforeRevokeBudgetApproval(address budgetApproval) internal view override onlyGovern("General") {}


    function _addAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId) internal {
        require(admissionTokenSetting[token].active == false, "Admission Token existed");
        require(token.isContract(), "Admission Token not Support!");

        admissionTokens.push(token);
        admissionTokenSetting[token] = AdmissionTokenSetting(
            minTokenToAdmit,
            tokenId,
            true
        );
        require(admissionTokens.length <= 3, "Admission Token length too long." );
    }

    function _mintMemberToken(uint256 amount) internal {
        address _memberToken = memberToken;
        require(address(_memberToken) != address(0), "Member Token not Exist.");
        IMemberToken(address(_memberToken)).mint(address(this), amount);
    }
    function _transferMemberToken(address to, uint amount) internal {
        address _memberToken = memberToken;
        require(address(_memberToken) != address(0), "Member Token not Exist.");
        
        IMemberToken(address(_memberToken)).transfer(to, amount);
    }
    function _addAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            require(address(erc20s[i]) != address(0), "Not Supported ERC20 Token");
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

    function _authorizeUpgrade(address) internal view override onlyGovern("General") {}

    function upgradeImplementations(address[] calldata targets, address[] calldata newImplementations, string memory remark) public onlyGovern("General") {
        require(targets.length == newImplementations.length, "params length not match");
        for (uint256 i = 0; i < targets.length; i++) {
            if (targets[i] == address(this)) {
                _upgradeTo(newImplementations[i]);
            } else {
                UUPSUpgradeable(targets[i]).upgradeTo(newImplementations[i]);
            }
        }
        
        emit UpgradeDao(remark);
    }

    function quit(uint256 membershipTokenId) public {
        address _membership = membership;
        address _member = IMembership(_membership).ownerOf(membershipTokenId);

        require(msg.sender == _member, "Permission denied");
        require(ILiquidPool(payable(liquidPool)).balanceOf(_member) == 0, "LP balance is not zero");
        require(IMembership(_membership).isMember(_member) == true, "Not a member");
    
        IMembership(_membership).removeMember(membershipTokenId);
        emit MemberQuit(_member);
    }

    function createArbRetryableTicket(address l2Target, uint256 value, bytes calldata data, uint256 maxSubmissionCost, uint256 maxGas, uint256 gasPriceBid) public onlyGovern("General") returns (bytes memory) {
        bytes memory executeData = abi.encodeWithSelector(
            IInbox.createRetryableTicket.selector,
            l2Target,
            0,
            maxSubmissionCost,
            address(this),
            address(this),
            maxGas,
            gasPriceBid,
            data
        );
        (bool success, bytes memory result) = Constant.ARBITRUM_L1_INBOX.call{ value: value + maxSubmissionCost + (maxGas * gasPriceBid) }(executeData);
        require(success, "fail");

        return result;
    }

    function multicall(address[] calldata targets, uint256[] calldata values, bytes[] calldata data) public onlyGovern("General") returns (bytes[] memory) {
        require(targets.length == values.length ||
            targets.length == data.length , "length not match");

        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i< targets.length; i++) {
            (bool success, bytes memory result) = address(targets[i]).call{value: values[i]}(data[i]);
            require(success, "executionFail");
            results[i] = result;
        }
        return results;
    }

    receive() external payable {
      if (msg.sender != address(0) && msg.value != 0) {
        emit Deposit(msg.sender, msg.value);
      }
    }

    uint256[49] private __gap;
}