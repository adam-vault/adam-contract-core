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
import "./interface/IGovern.sol";
import "./interface/IMemberToken.sol";
import "./interface/ITeam.sol";
import "./interface/ILiquidPool.sol";

import "./lib/Concat.sol";
import "./lib/Constant.sol";

import "./lib/InterfaceChecker.sol";
import "./lib/ToString.sol";
import "./lib/RevertMsg.sol";
import "./base/DaoChildBeaconProxy.sol";

import "@openzeppelin/contracts/utils/StorageSlot.sol";

contract Dao is Initializable, ERC721HolderUpgradeable, ERC1155HolderUpgradeable, BudgetApprovalExecutee {
    using Concat for string;
    using AddressUpgradeable for address;
    using InterfaceChecker for address;

    struct InitializeParams {
        address _creator;
        address _membership;
        address _liquidPool;
        address _team;
        string _name;
        string _description;
        address baseCurrency;
        string _memberTokenName;
        string _memberTokenSymbol;
        address[] depositTokens;
    }


    enum VoteType {
        Membership,
        MemberToken,
        ExistingToken
    }

    address public creator;
    address public adam;
    string public name;
    string public description;
    uint256 public locktime;
    uint256 public minDepositAmount;
    address public baseCurrency;
    string public logoCID;
    bool private _initializing;

    mapping(address => uint256) public firstDepositTime;
    mapping(address => bool) public isAssetSupported;
    mapping(uint256 => bool) public teamWhitelist;

    mapping(string => address) public govern;
    mapping(bytes32 => address) public plugins;

    event AllowDepositToken(address token);
    event CreateMemberToken(address creator, address token);
    event SetFirstDepositTime(address owner, uint256 time);
    event WhitelistTeam(uint256 tokenId);
    event AddAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId, bool isMemberToken);
    event CreateMember(address account, uint256 depositAmount);
    event Deposit(address account, uint256 amount);
    event UpgradeDaoBeacon(address daoBeacon);

    event RemoveAdmissionToken(address token);
    event UpdateLocktime(uint256 locktime);
    event UpdateMinDepositAmount(uint256 amount);
    event UpdateLogoCID(string logoCID);
    event UpdateDescription(string description);
    event CreateGovern(
        string name,
        address govern,
        address voteToken
    );
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(InitializeParams memory params, bytes[] memory data) public initializer {
        require( 
            address(params._creator) != address(0)
            && address(params._team) != address(0)
            && address(params.baseCurrency) != address(0)
        , "Invaild Dao Setting");
        _initializing = true;

        ___BudgetApprovalExecutee_init(params._team);

        adam = msg.sender;
        name = params._name;
        creator = params._creator;

        plugins[Constant.BEACON_NAME_MEMBERSHIP] = params._membership;
        plugins[Constant.BEACON_NAME_LIQUID_POOL] = params._liquidPool;
        baseCurrency = params.baseCurrency;
        description = params._description;

        _mintMember(params._creator);
        _createMemberToken(params._memberTokenName, params._memberTokenSymbol);
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
            msg.sender == govern[category] ||
            _initializing, "Action not permitted");
        _;
    }

    function membership() public view returns(address) {
        return plugins[Constant.BEACON_NAME_MEMBERSHIP];
    }
    function liquidPool() public view returns(address) {
        return plugins[Constant.BEACON_NAME_LIQUID_POOL];
    }
    function memberToken() public view returns(address) {
        return plugins[Constant.BEACON_NAME_MEMBER_TOKEN];
    }

    function canCreateBudgetApproval(address budgetApproval) public view returns (bool) {
        return IAdam(adam).budgetApprovals(budgetApproval);
    }

    function byPassGovern(address account) public view returns (bool) {
        return (IMembership(membership()).totalSupply() == 1 && IMembership(membership()).isMember(account));
    }

    function setFirstDepositTime(address owner, uint256 timestamp) public {
        require(msg.sender == liquidPool() || msg.sender == membership(), "only LP");
        firstDepositTime[owner] = timestamp;
        emit SetFirstDepositTime(owner, timestamp);
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

    function setDescription(string calldata _description) public onlyGovern("General") {
        description = _description;
        emit UpdateDescription(_description);
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
            address _membership = membership();
            require(_membership != address(0), "Membership not yet initialized");
            _voteToken = _membership;
        } else if (voteType ==  VoteType.MemberToken) {
            address _memberToken = memberToken();
            require(_memberToken != address(0), "MemberToken not yet initialized");
            _voteToken = _memberToken;
        } else if (voteType == VoteType.ExistingToken) {
            require(externalVoteToken != address(0), "Vote token not exist");
            _voteToken = externalVoteToken;
        }

        DaoChildBeaconProxy _govern = new DaoChildBeaconProxy(address(this), Constant.BEACON_NAME_GOVERN, "");
        govern[_name] = address(_govern);

        IGovern(payable(address(_govern))).initialize(
            address(this),
            _name,
            duration,
            quorum,
            passThreshold,
            _voteToken,
            durationInBlock
        );
        emit CreateGovern(
            _name,
            address(_govern),
            _voteToken
        );
    }

    function setMemberTokenAsAdmissionToken(uint256 minTokenToAdmit) public onlyGovern("General") {
        IMembership(membership()).setMemberTokenAsAdmissionToken(minTokenToAdmit);
    }

    function addAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId) public onlyGovern("General") {
        IMembership(membership()).addAdmissionToken(token, minTokenToAdmit, tokenId);
    }

    function addAssets(address[] calldata erc20s) public onlyGovern("General") {
        _addAssets(erc20s);
    }

    function createTeam(string memory title, address minter, address[] memory members, string memory description) public onlyGovern("General") {
      uint256 id = ITeam(team()).addTeam(title, minter, members, description);
      teamWhitelist[id] = true;

      emit WhitelistTeam(id);
    }

    function _createMemberToken(string memory _name, string memory _symbol) internal {
        require(memberToken() == address(0), "Member token already initialized");

        DaoChildBeaconProxy _memberTokenContract = new DaoChildBeaconProxy(address(this), Constant.BEACON_NAME_MEMBER_TOKEN, "");
        address _memberToken = address(_memberTokenContract);
        plugins[Constant.BEACON_NAME_MEMBER_TOKEN] = _memberToken;
        IMemberToken(_memberToken).initialize(address(this), _name, _symbol);
        _addAsset(_memberToken);

        emit CreateMemberToken(msg.sender, _memberToken);
    }

    function afterDeposit(address account, uint256 amount) external {
        require(msg.sender == liquidPool(), "only LP");
        if (firstDepositTime[account] == 0) {
            setFirstDepositTime(account, block.timestamp);
            require(amount >= minDepositAmount, "deposit amount not enough");
            
            if (IMembership(membership()).isMember(account)) {
                return;
            }
            _mintMember(account);

            emit CreateMember(account, amount);
        }
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovern("General") {
        require(canCreateBudgetApproval(budgetApproval), "Budget Implementation not whitelisted");
    }

    function _beforeRevokeBudgetApproval(address budgetApproval) internal view override onlyGovern("General") {}


    function _mintMemberToken(uint256 amount) internal {
        address _memberToken = memberToken();
        require(address(_memberToken) != address(0), "Member Token not Exist.");
        IMemberToken(address(_memberToken)).mint(address(this), amount);
    }
    function _transferMemberToken(address to, uint amount) internal {
        address _memberToken = memberToken();
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
        IMembership(membership()).createMember(owner);
    }

    function upgradeTo(address _daoBeacon) external onlyGovern("General") {
        address curBeacon = IDaoBeaconProxy(address(this)).daoBeacon();
        require(AddressUpgradeable.isContract(_daoBeacon), "ERC1967: new beacon is not a contract");
        require(IAdam(adam).daoBeaconIndex(_daoBeacon) > IAdam(adam).daoBeaconIndex(curBeacon), "invalid downgrade");
        StorageSlot.getAddressSlot(bytes32(keccak256("adam.proxy.beacon.slot"))).value = _daoBeacon;
        emit UpgradeDaoBeacon(_daoBeacon);
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

    function version() public view returns(uint256) {
        return 2;
    }

    uint256[49] private __gap;
}