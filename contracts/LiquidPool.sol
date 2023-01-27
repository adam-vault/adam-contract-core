// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./base/BudgetApprovalExecutee.sol";
import "./base/PriceResolver.sol";
import "./lib/Concat.sol";
import "./interface/IDao.sol";

contract LiquidPool is Initializable, ERC20Upgradeable, PriceResolver, BudgetApprovalExecutee, OwnableUpgradeable {
    using Concat for string;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    
    address private _baseCurrency;
    address[] public assets;
    mapping(address => uint256) private _assetIndex;

    event AllowDepositToken(address token);
    event DisallowDepositToken(address token);
    event Deposit(address account, address token, uint256 depositAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
      _disableInitializers();
    }

    function initialize(
        address[] memory depositTokens,
        address __baseCurrency
    )
        public initializer
    {
        __Ownable_init();
        __ERC20_init("LiquidPool", "LP");
        _baseCurrency = __baseCurrency;
        _addAssets(depositTokens);
        
        require(accountingSystem() != address(0), "AccountingSystem is required");
    }

    function baseCurrency() public view override returns(address) {
        return _baseCurrency;
    }

    function team() public view override returns(address) {
        return _dao().team();
    }

    function accountingSystem() public view override(PriceResolver, BudgetApprovalExecutee) returns(address) {
        return _dao().accountingSystem();
    }
    
    function _dao() internal view returns (IDao) {
        return IDao(payable(owner()));
    }

    function assetsShares(address asset, uint256 amount) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();

        require(amount <= _totalSupply, "gt totalSupply");
        require(isAssetSupported(asset), "Asset not support");
        if (_totalSupply == 0) return 0;

        return _assetBalance(asset) * amount / _totalSupply;
    }

    function quote(uint256 amount) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) return amount;
        return amount * _totalSupply / totalPrice();
    }

    function canAddAsset(address asset) public view returns (bool) {
        return canResolvePrice(asset);
    }

    function totalPrice() public view returns (uint256) {
        uint256 total;
        uint256 _assetsLength = assets.length;

        for (uint256 i = 0; i < _assetsLength; i++) {
            address _asset = assets[i];
            total += assetBaseCurrencyPrice(_asset,  _assetBalance(_asset));
        }
        return total;
    }

    function totalPriceInEth() public view returns (uint256) {
        uint256 total;
        uint256 _assetsLength = assets.length;

        for (uint256 i = 0; i < _assetsLength; i++) {
            address _asset = assets[i];
            total += assetPrice(_asset, Denominations.ETH, _assetBalance(_asset));
        }
        return total;
    }

    function isAssetSupported(address asset) public view returns (bool) {
        return _assetIndex[asset] > 0;
    }

    function deposit(address receiver) public payable {
        require(isAssetSupported(Denominations.ETH), "asset not support");

        uint256 _totalSupply = totalSupply();
        uint256 ethPriceInBaseCurrency = assetBaseCurrencyPrice(Denominations.ETH, msg.value);

        if (_totalSupply == 0) {
            _mint(receiver, ethPriceInBaseCurrency);
            _afterDeposit(receiver, ethPriceInBaseCurrency);
            emit Deposit(receiver, Denominations.ETH, msg.value);
            return;
        }
        uint256 total = totalPrice() - ethPriceInBaseCurrency;
        _mint(receiver, ethPriceInBaseCurrency * _totalSupply / total);

        _afterDeposit(receiver, ethPriceInBaseCurrency);

        emit Deposit(receiver, Denominations.ETH, msg.value);
    }

    function redeem(uint256 amount) public {
        IDao __dao = _dao();
        require(balanceOf(msg.sender) >= amount, "not enough balance");
        require(__dao.firstDepositTime(msg.sender) + __dao.locktime() <= block.timestamp, "lockup time");

        uint256 _assetsLength = assets.length;
        for (uint256 i = 0; i < _assetsLength; i++) {
            address _asset = assets[i];
            _transferAsset(msg.sender, _asset, assetsShares(_asset, amount));
        }
        _burn(msg.sender, amount);
    }

    function depositToken(address receiver, address asset, uint256 amount) public {
        require(isAssetSupported(asset), "Asset not support");
        require(IERC20MetadataUpgradeable(asset).allowance(msg.sender, address(this)) >= amount, "not approve");

        uint256 assetPriceInBaseCurrency = assetBaseCurrencyPrice(asset, amount);
        _mint(receiver, quote(assetPriceInBaseCurrency));
        IERC20MetadataUpgradeable(asset).safeTransferFrom(msg.sender, address(this), amount);
        _afterDeposit(receiver, assetPriceInBaseCurrency);

        emit Deposit(receiver, asset, amount);
    }

    function addAssets(address[] calldata erc20s) public onlyOwner {
        _addAssets(erc20s);
    }

    function removeAssets(address[] calldata erc20s) public onlyOwner {
        _removeAssets(erc20s);
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyOwner {
        require(_dao().canCreateBudgetApproval(budgetApproval), "not whitelist");
    }

    function _beforeRevokeBudgetApproval(address budgetApproval) internal view override onlyOwner {}

    function _assetBalance(address asset) internal view returns (uint256) {
        if(asset == Denominations.ETH) {
            return address(this).balance;
        }
        
        return IERC20MetadataUpgradeable(asset).balanceOf(address(this));
    }

    function _transferAsset(address target, address asset, uint256 amount) internal {
        if(asset == Denominations.ETH) {
            (bool success, ) = payable(target).call{ value: amount }("");
            require(success, "Failed to send Ether");
        } else {
            IERC20MetadataUpgradeable(asset).safeTransfer(target, amount);
        }
    }
    
    function _afterDeposit(address account, uint256 amount) private {
      _dao().afterDeposit(account, amount);
    }

    function _addAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            _addAsset(erc20s[i]);
        }
    }

    function _removeAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            _removeAsset(erc20s[i]);
        }
    }

    function _addAsset(address erc20) internal {
        require(canAddAsset(erc20) && !isAssetSupported(erc20), "Asset not support");
        assets.push(erc20);
        _assetIndex[erc20] = assets.length;

        emit AllowDepositToken(erc20);
    }

    function _removeAsset(address erc20) internal {
        require(isAssetSupported(erc20), "Asset not in list");
        uint256 index = _assetIndex[erc20] - 1;
        address lastEl = assets[assets.length - 1];
        assets[index] = lastEl;

        _assetIndex[lastEl] = index + 1;
        _assetIndex[erc20] = 0;
        assets.pop();
        emit DisallowDepositToken(erc20);
    }

    function assetsLength() public view returns(uint256) {
        return assets.length;
    }
    receive() external payable {}

    uint256[50] private __gap;
}