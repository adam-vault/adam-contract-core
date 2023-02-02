// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

import "./base/BudgetApprovalExecutee.sol";
import "./base/DaoChildBeaconProxy.sol";

import "./interface/IAdam.sol";
import "./interface/IMembership.sol";
import "./interface/IGovern.sol";
import "./interface/IMemberToken.sol";
import "./interface/ITeam.sol";
import "./interface/ILiquidPool.sol";

import "./lib/Constant.sol";


contract Dao is Initializable, ERC721HolderUpgradeable, ERC1155HolderUpgradeable, BudgetApprovalExecutee {
    using Concat for string;
    using AddressUpgradeable for address;

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

    mapping(string => address) public govern;
    mapping(bytes32 => address) public plugins;
    mapping(address => bool) public isPlugin;

    event AllowDepositToken(address token);
    event CreateMemberToken(address token);
    event SetFirstDepositTime(address owner, uint256 time);
    event WhitelistTeam(uint256 tokenId);
    event AddAdmissionToken(address token, uint256 minTokenToAdmit, uint256 tokenId, bool isMemberToken);
    event CreateMember(address account, uint256 depositAmount);
    event Deposit(address account, uint256 amount);
    event UpgradeDaoBeacon(address daoBeacon);

    event RemoveAdmissionToken(address token);
    event UpdateName(string newName);
    event UpdateLocktime(uint256 locktime);
    event UpdateMinDepositAmount(uint256 amount);
    event UpdateLogoCID(string logoCID);
    event UpdateDescription(string description);
    event CreatePlugin(bytes32 contractName, address plugin);
    event CreateGovern(
        string name,
        address govern,
        address voteToken
    );

    error InvalidAddress(address addr);
    error InvalidContract(address _contract);
    error ContractCallFail(bytes result);
    error Unauthorized();
    error PluginRequired(bytes32 contractName);
    error PluginAlreadyExists(bytes32 contractName);
    error PluginNotAllowed(bytes32 contractName);
    error GovernAlreadyExists(string gName);
    error InsufficientDeposit();
    error BudgetApprovalTemplateNotWhitelisted(address template);
    error UnsupportedDowngrade();
    error InputLengthNotMatch(uint count1, uint count2);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(
        address _creator,
        string calldata _name,
        string calldata _description,
        address _baseCurrency,
        bytes[] calldata _data) public initializer {
        if (_creator == address(0)) {
            revert InvalidAddress(_creator);
        }
        if (_baseCurrency == address(0)) {
            revert InvalidAddress(_baseCurrency);
        }

        _initializing = true;
        adam = msg.sender;
        creator = _creator;
        setName(_name);
        setDescription(_description);
        baseCurrency = _baseCurrency;

        for (uint256 i = 0; i< _data.length; i++) {
            (bool success, bytes memory result) = address(this).call(_data[i]);
            if (!success) {
                revert ContractCallFail(result);
            }
        }

        _initializing = false;
    }
    

    modifier onlyGovernGeneral() {
        if (!byPassGovern(msg.sender) &&
            msg.sender != govern["General"] &&
            !_initializing) {
                revert Unauthorized();
            }
        _;
    }
    modifier onlyPlugins() {
        if (!isPlugin[msg.sender]) {
                revert Unauthorized();
            }
        _;
    }

    modifier requirePlugin(bytes32 contractName) {
        if (plugins[contractName] == address(0)) {
            revert PluginRequired(contractName);
        }
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
    function team() public view override returns(address) {
        return plugins[Constant.BEACON_NAME_TEAM];
    }
    function accountingSystem() public view override returns(address) {
        return plugins[Constant.BEACON_NAME_ACCOUNTING_SYSTEM];
    }

    function createPlugin(bytes32 contractName, bytes calldata data) public onlyGovernGeneral returns(address) {
        DaoChildBeaconProxy _plugin = new DaoChildBeaconProxy(address(this), contractName, data);
        _addToPlugins(contractName, address(_plugin));
        return address(_plugin);
    }

    function executePlugin(bytes32 contractName, bytes calldata data, uint256 value) public onlyGovernGeneral requirePlugin(contractName) returns(bytes memory) {
        (bool success, bytes memory result) = address(plugins[contractName]).call{value: value}(data);
        if (!success) {
            revert ContractCallFail(result);
        }
        return result;
    }

    function _addToPlugins(bytes32 contractName, address dest) internal {
        if(contractName == Constant.BEACON_NAME_DAO) {
            revert PluginNotAllowed(contractName);
        }
        if (plugins[contractName] != address(0)) {
            revert PluginAlreadyExists(contractName);
        }
        plugins[contractName] = dest;
        isPlugin[dest] = true;

        emit CreatePlugin(contractName, dest);
    }

    function canCreateBudgetApproval(address budgetApproval) public view returns (bool) {
        return IAdam(adam).budgetApprovals(budgetApproval);
    }
    function canAddPriceGateway(address priceGateway) public view returns (bool) {
        return IAdam(adam).priceGateways(priceGateway);
    }

    function byPassGovern(address account) public view returns (bool) {
        if (membership() == address(0))
            return true;
        return (IMembership(membership()).totalSupply() == 1 && IMembership(membership()).isMember(account));
    }

    function setFirstDepositTime(address owner, uint256 timestamp) public onlyPlugins {
        firstDepositTime[owner] = timestamp;
        emit SetFirstDepositTime(owner, timestamp);
    }

    function setName(string calldata _name) public onlyGovernGeneral {
        name = _name;
        emit UpdateName(_name);
    }

    function setLocktime(uint256 _locktime) public onlyGovernGeneral {
        locktime = _locktime;
        emit UpdateLocktime(_locktime);
    }

    function setMinDepositAmount(uint256 _minDepositAmount) public onlyGovernGeneral {
        minDepositAmount = _minDepositAmount;
        emit UpdateMinDepositAmount(_minDepositAmount);
    }

    function setDescription(string calldata _description) public onlyGovernGeneral {
        description = _description;
        emit UpdateDescription(_description);
    }

    function setLogoCID(string calldata _logoCID) public onlyGovernGeneral {
        logoCID = _logoCID;
        emit UpdateLogoCID(_logoCID);
    }

    function createGovern(
        string calldata _name,
        uint256 quorum,
        uint256 passThreshold,
        VoteType voteType,
        address externalVoteToken,
        uint256 durationInBlock
    ) public onlyGovernGeneral {
        address _voteToken;

        if (govern[_name] != address(0)) {
            revert GovernAlreadyExists(_name);
        }

        if (voteType == VoteType.Membership) {
            address _membership = membership();
            if (_membership == address(0)) {
                revert PluginRequired(Constant.BEACON_NAME_MEMBERSHIP);
            }
            _voteToken = _membership;
        } else if (voteType ==  VoteType.MemberToken) {
            address _memberToken = memberToken();
            if (_memberToken == address(0)) {
                revert PluginRequired(Constant.BEACON_NAME_MEMBER_TOKEN);
            }
            _voteToken = _memberToken;
        } else if (voteType == VoteType.ExistingToken) {
            if (!externalVoteToken.isContract()) {
                revert InvalidContract(externalVoteToken);
            }
            _voteToken = externalVoteToken;
        }

        DaoChildBeaconProxy _govern = new DaoChildBeaconProxy(address(this), Constant.BEACON_NAME_GOVERN, "");
        govern[_name] = address(_govern);

        IGovern(payable(address(_govern))).initialize(
            _name,
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

    function addAssets(address[] calldata erc20s) public onlyGovernGeneral {
        _addAssets(erc20s);
    }

    function afterDeposit(address account, uint256 amount) external onlyPlugins {
        if (firstDepositTime[account] == 0) {
            setFirstDepositTime(account, block.timestamp);
            if (amount < minDepositAmount) {
                revert InsufficientDeposit();
            }
            
            if (IMembership(membership()).isMember(account)) {
                return;
            }
            _mintMember(account);

            emit CreateMember(account, amount);
        }
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovernGeneral {
        if (!IAdam(adam).budgetApprovals(budgetApproval)) {
            revert BudgetApprovalTemplateNotWhitelisted(budgetApproval);
        }
    }

    function _beforeRevokeBudgetApproval(address budgetApproval) internal view override onlyGovernGeneral {}

    function _addAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            address erc20 = erc20s[i];
            if (!erc20.isContract()) {
                revert InvalidContract(erc20);
            }
            _addAsset(erc20);
        }
    }
    function _addAsset(address erc20) internal {
        isAssetSupported[erc20] = true;
        emit AllowDepositToken(erc20);
    }

    function _mintMember(address owner) internal requirePlugin(Constant.BEACON_NAME_MEMBERSHIP) {
        IMembership(membership()).createMember(owner);
    }

    function upgradeTo(address _daoBeacon) external onlyGovernGeneral {
        address curBeacon = IDaoBeaconProxy(address(this)).daoBeacon();

        if (!_daoBeacon.isContract()) {
            revert InvalidContract(_daoBeacon);
        }
        if (IAdam(adam).daoBeaconIndex(_daoBeacon) <= IAdam(adam).daoBeaconIndex(curBeacon)) {
            revert UnsupportedDowngrade();
        }

        StorageSlot.getAddressSlot(bytes32(keccak256("adam.proxy.beacon.slot"))).value = _daoBeacon;

        emit UpgradeDaoBeacon(_daoBeacon);
    }

    function multicall(address[] calldata targets, uint256[] calldata values, bytes[] calldata data) public onlyGovernGeneral returns (bytes[] memory) {
        if (targets.length != values.length) {
            revert InputLengthNotMatch(targets.length, values.length);
        }
        if (targets.length != data.length) {
            revert InputLengthNotMatch(targets.length, data.length);
        }

        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i< targets.length; i++) {
            (bool success, bytes memory result) = address(targets[i]).call{value: values[i]}(data[i]);
            if (!success) {
                revert ContractCallFail(result);
            }
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