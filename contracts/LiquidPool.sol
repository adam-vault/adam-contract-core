// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./base/BudgetApprovalExecutee.sol";

import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./base/PriceResolver.sol";
import "./lib/Concat.sol";
import "hardhat/console.sol";
import "./interface/IDao.sol";

contract LiquidPool is Initializable, UUPSUpgradeable, ERC20Upgradeable, PriceResolver, BudgetApprovalExecutee {
    using Concat for string;
    
    IDao public dao;
    address[] public assets;
    mapping(address => bool) public isAssetSupported;

    event AllowDepositToken(address token);

    modifier onlyGovern(string memory category) {
        require(
            (dao.byPassGovern(msg.sender)) || msg.sender == dao.govern(category),
            string("Dao: only Govern").concat(category));
        _;
    }

    // to be removed in future
    modifier onlyGovernOrDao(string memory category) {
        require(
            (dao.byPassGovern(msg.sender)) || msg.sender == dao.govern(category) || msg.sender == address(dao),
            string("Dao: only Govern").concat(category));
        _;
    }

    function initialize(
        address owner,
        address feedRegistry,
        address[] memory depositTokens
    )
        public initializer
    {
        __ERC20_init("LiquidPool", "LP");
        dao = IDao(payable(owner));
        _addAssets(depositTokens); // todo
    }

    function assetsShares(address asset, uint256 amount) public view returns (uint256) {
        require(amount <= totalSupply(), "gt totalSupply");
        require(isAssetSupported[asset], "Asset not support");
        if (totalSupply() == 0) return 0;

        return IERC20Metadata(asset).balanceOf(address(this)) * amount / totalSupply();
    }

    function ethShares(uint256 amount) public view returns (uint256) {
        require(amount <= totalSupply(), "gt totalSupply");
        if (totalSupply() == 0) return 0;
        return address(this).balance * amount / totalSupply();
    }

    function quote(uint256 eth) public view returns (uint256) {
        if (totalSupply() == 0) return eth;
        return (eth * 10 ** 18) / (totalPrice() * 10 ** 18 / totalSupply());
    }

    function canAddAsset(address asset) public view returns (bool) {
        return canResolvePrice(asset);
    }

    function totalPrice() public view returns (uint256) {
        return _assetsPrice() + address(this).balance;
    }

    function deposit() public payable {
        if (totalSupply() == 0) {
            _mint(msg.sender, msg.value);
            _afterDeposit(msg.sender, msg.value);
            return;
        }
        uint256 total = address(this).balance - msg.value + _assetsPrice();
        _mint(msg.sender, (msg.value * 10**18) / (total * 10**18 / totalSupply()));

        _afterDeposit(msg.sender, msg.value);
    }

    function redeem(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "not enough balance");
        require(dao.firstDepositTime(msg.sender) + dao.locktime() <= block.timestamp, "lockup time");

        payable(msg.sender).transfer(ethShares(amount));
        for (uint256 i = 0; i < assets.length; i++) {
            IERC20Metadata(assets[i]).transfer(msg.sender, assetsShares(assets[i], amount));
        }
        _burn(msg.sender, amount);
    }

    function depositToken(address asset, uint256 amount) public {
        require(isAssetSupported[asset], "Asset not support");
        require(IERC20Metadata(asset).allowance(msg.sender, address(this)) >= amount, "not approve");

        _mint(msg.sender, quote(assetEthPrice(asset, amount)));
        IERC20Metadata(asset).transferFrom(msg.sender, address(this), amount);
        _afterDeposit(msg.sender, assetEthPrice(asset, amount));
    }

    function addAssets(address[] calldata erc20s) public onlyGovern("DaoSetting") {
        _addAssets(erc20s);
    }

    function _beforeCreateBudgetApproval(address budgetApproval) internal view override onlyGovernOrDao("BudgetApproval") {
        require(dao.canCreateBudgetApproval(budgetApproval), "not whitelist");
    }

    function _assetsPrice() internal view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < assets.length; i++) {
            total += assetEthPrice(assets[i],  IERC20Metadata(assets[i]).balanceOf(address(this)));
        }
        return total;
    }
    
    function _afterDeposit(address account, uint256 eth) private {
        if (dao.firstDepositTime(account) == 0) {
            dao.setFirstDepositTime(account);

            require(eth >= dao.minDepositAmount(), "deposit amount not enough");
            if (!dao.isMember(account)) {if(dao.minTokenToAdmission() > 0 ){
                    bytes4 sector = bytes4(keccak256("balanceOf(address)"));
                    bytes memory data = abi.encodeWithSelector(sector, account);
                    (, bytes memory result) = address(dao.admissionToken()).call(data);
                    
                    uint256 balance = abi.decode(result,(uint256));
                    require( balance >= dao.minTokenToAdmission(), "member token not enough");
                }
                dao.mintMember(account);
            }
        }

    }
    function _addAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            _addAsset(erc20s[i]);
        }
    }

    function _addAsset(address erc20) internal {
        require(canAddAsset(erc20) && !isAssetSupported[erc20], "Asset not support");
        assets.push(erc20);
        isAssetSupported[erc20] = true;

        emit AllowDepositToken(erc20);
    }

    function _authorizeUpgrade(address newImplementation) internal override initializer {}
    receive() external payable {}
}