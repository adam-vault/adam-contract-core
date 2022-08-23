// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.7;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./base/BudgetApprovalExecutee.sol";

import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./base/PriceResolver.sol";
import "./lib/Concat.sol";
import "hardhat/console.sol";
import "./interface/IDao.sol";

contract LiquidPool is Initializable, UUPSUpgradeable, ERC20Upgradeable, PriceResolver, BudgetApprovalExecutee {
    using Concat for string;
    
    IDao public dao;
    address[] public assets;
    mapping(address => uint256) private _assetIndex;

    event AllowDepositToken(address token);
    event DisallowDepositToken(address token);
    event Deposit(address account, address token, uint256 depositAmount);

    modifier onlyGovern(string memory category) {
        require(
            (dao.byPassGovern(msg.sender)) || msg.sender == dao.govern(category),
            string("Dao: only Govern").concat(category));
        _;
    }

    modifier onlyDao() {
        require(msg.sender == address(dao), "not dao");
        _;
    }

    function initialize(
        address owner,
        address[] memory depositTokens,
        address baseCurrency
    )
        public initializer
    {
        __ERC20_init("LiquidPool", "LP");
        __PriceResolver_init(baseCurrency);
        dao = IDao(payable(owner));
        _addAssets(depositTokens); // todo
        team = dao.team();
    }

    function assetsShares(address asset, uint256 amount) public view returns (uint256) {
        require(amount <= totalSupply(), "gt totalSupply");
        require(isAssetSupported(asset), "Asset not support");
        if (totalSupply() == 0) return 0;

        return _assetBalance(asset) * amount / totalSupply();
    }

    function quote(uint256 amount) public view returns (uint256) {
        if (totalSupply() == 0) return amount;
        return (amount * 10 ** baseCurrencyDecimals()) / (totalPrice() * 10 ** baseCurrencyDecimals() / totalSupply());
    }

    function canAddAsset(address asset) public view returns (bool) {
        return canResolvePrice(asset);
    }

    function totalPrice() public view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < assets.length; i++) {
            total += assetBaseCurrencyPrice(assets[i],  _assetBalance(assets[i]));
        }
        return total;
    }

    function totalPriceInEth() public view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < assets.length; i++) {
            total += assetEthPrice(assets[i],  _assetBalance(assets[i]));
        }
        return total;
    }

    function isAssetSupported(address asset) public view returns (bool) {
        return _assetIndex[asset] > 0;
    }

    function deposit(address receiver) public payable {
        require(isAssetSupported(Denominations.ETH), "asset not support");
        if (totalSupply() == 0) {
            _mint(receiver, assetBaseCurrencyPrice(Denominations.ETH, msg.value));
            _afterDeposit(receiver, assetBaseCurrencyPrice(Denominations.ETH, msg.value));
            emit Deposit(receiver, Denominations.ETH, msg.value);
            return;
        }
        uint256 total = totalPrice() - assetBaseCurrencyPrice(Denominations.ETH, msg.value);
        _mint(receiver, (assetBaseCurrencyPrice(Denominations.ETH, msg.value) * 10 ** baseCurrencyDecimals()) / (total * 10 ** baseCurrencyDecimals() / totalSupply()));

        _afterDeposit(receiver, assetBaseCurrencyPrice(Denominations.ETH, msg.value));

        emit Deposit(receiver, Denominations.ETH, msg.value);
    }

    function redeem(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "not enough balance");
        require(dao.firstDepositTime(msg.sender) + dao.locktime() <= block.timestamp, "lockup time");

        for (uint256 i = 0; i < assets.length; i++) {
            _transferAsset(msg.sender, assets[i], assetsShares(assets[i], amount));
        }
        _burn(msg.sender, amount);
    }

    function depositToken(address receiver, address asset, uint256 amount) public {
        require(isAssetSupported(asset), "Asset not support");
        require(IERC20Metadata(asset).allowance(msg.sender, address(this)) >= amount, "not approve");

        _mint(receiver, quote(assetBaseCurrencyPrice(asset, amount)));
        IERC20Metadata(asset).transferFrom(msg.sender, address(this), amount);
        _afterDeposit(receiver, assetBaseCurrencyPrice(asset, amount));

        emit Deposit(receiver, asset, amount);
    }

    function addAssets(address[] calldata erc20s) public onlyGovern("General") {
        _addAssets(erc20s);
    }

    function removeAssets(address[] calldata erc20s) public onlyGovern("General") {
        _removeAssets(erc20s);
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovern("General") {
        require(dao.canCreateBudgetApproval(budgetApproval), "not whitelist");
    }

    function _assetBalance(address asset) internal view returns (uint256) {
        if(asset == Denominations.ETH) {
            return address(this).balance;
        }
        
        return IERC20Metadata(asset).balanceOf(address(this));
    }

    function _transferAsset(address target, address asset, uint256 amount) internal {
        if(asset == Denominations.ETH) {
            payable(target).transfer(amount);
        } else {
            IERC20Metadata(asset).transfer(target, amount);
        }
    }
    
    function _afterDeposit(address account, uint256 amount) private {
      dao.afterDeposit(account, amount);
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

    function _authorizeUpgrade(address) internal view override onlyDao {}
    receive() external payable {}
}