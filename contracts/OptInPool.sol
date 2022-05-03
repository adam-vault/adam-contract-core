// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

import "./base/BudgetApprovalExecutee.sol";

import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";

import "./lib/Concat.sol";
import "hardhat/console.sol";
import "./interface/IDepositPool.sol";

contract OptInPool is Initializable, UUPSUpgradeable, ERC20Upgradeable, BudgetApprovalExecutee, ERC721HolderUpgradeable, ERC1155HolderUpgradeable {
    using Concat for string;
    
    FeedRegistryInterface public registry;
    IDepositPool public depositPool;
    address public depositToken;
    address[] public redeemTokens;
    mapping(address => bool) public isRedeemTokens;
    uint256 public depositThrehold;
    uint256 public recevied;
    uint256 public depositDeadline;
    uint256 public redeemTime;

    address public executor;


    event CreateBudgetApproval(address budgetApproval, bytes data);
    event AllowDepositToken(address token);

    function initialize(
        address _executor,
        address _depositPool,
        address _depositToken,
        uint256 _depositThrehold,
        uint256 _depositDeadline,
        address[] memory _redeemTokens,
        uint256 _redeemTime,
        address[] memory _budgetApprovals,
        bytes[] memory _budgetApprovalsData
    ) public initializer {
        require(depositPool.id(depositToken) != 0, "Token not supported");
        __ERC20_init("OptInPool", "OP");
        executor = _executor;
        depositPool = IDepositPool(_depositPool);
        depositToken = _depositToken;
        depositThrehold = _depositThrehold;
        depositDeadline = _depositDeadline;
        redeemTime = _redeemTime;
        for (uint256 i = 0; i < _redeemTokens.length; i++) {
            redeemTokens.push(_redeemTokens[i]);
            isRedeemTokens[_redeemTokens[i]] = true;
        }
        _createBudgetApprovals(_budgetApprovals, _budgetApprovalsData);
    }


    function assetsShares(address asset, uint256 amount) public view returns (uint256) {
        require(amount <= totalSupply(), "gt totalSupply");
        require(isRedeemTokens[asset], "Asset not support");
        return IERC20(asset).balanceOf(address(this)) * amount / totalSupply();
    }

    function ethShares(uint256 amount) public view returns (uint256) {
        require(amount <= totalSupply(), "gt totalSupply");
        return address(this).balance * amount / totalSupply();
    }

    function join(uint256 amount) public {
        require(block.timestamp < depositDeadline, "depositDeadline passed");
        depositPool.safeTransferFrom(msg.sender, address(this), depositPool.id(depositToken), amount, "");
        depositPool.redeem(depositToken, amount);

        _mint(msg.sender, amount);
        recevied += amount;
    }

    function refund(address[] memory accounts) public {
        require(block.timestamp >= depositDeadline && recevied < depositThrehold, "cannot refund");
        require(msg.sender == executor, "not executor");
        for(uint i = 0; i < accounts.length; i++) {
            _refund(accounts[i]);
        }
    }

    function redeem(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "not enough balance");
        require(block.timestamp >= redeemTime, "invalid redeemTime");

        _burn(msg.sender, amount);
        for (uint256 i = 0; i < redeemTokens.length; i++) {
            uint256 assetAmount;
            if (Denominations.ETH == redeemTokens[i]) {
                assetAmount = ethShares(amount);
            } else {
                assetAmount = assetsShares(redeemTokens[i], amount);
            }
            _depositToDP(redeemTokens[i], assetAmount);
            depositPool.safeTransferFrom(address(this), msg.sender, depositPool.id(redeemTokens[i]), assetAmount, "");
        }
    }

    function transferERC721(address erc721, address recipient, uint256 id) public {
        IERC721(erc721).safeTransferFrom(address(this), recipient, id);
    }
    function transferERC20(address erc20, address recipient, uint256 amount) public {
        IERC20(erc20).transfer(recipient, amount);
    }

    function _createBudgetApprovals(address[] memory _budgetApprovals, bytes[] memory data) internal {
        require(_budgetApprovals.length == data.length, "input invalid");

        for(uint i = 0; i < _budgetApprovals.length; i++) {
            require(depositPool.canCreateBudgetApproval(_budgetApprovals[i]), "not whitelist");
            ERC1967Proxy _budgetApproval = new ERC1967Proxy(_budgetApprovals[i], data[i]);
            budgetApprovals[address(_budgetApproval)] = true;
            emit CreateBudgetApproval(address(_budgetApproval), data[i]);
        }
    }

    function _refund(address account) internal {
        uint256 balance = balanceOf(account);
        require(balance > 0, "not in list");
        _burn(msg.sender, balance);
        _depositToDP(depositToken, balance);
        depositPool.safeTransferFrom(address(this), account, depositPool.id(depositToken), balance, "");
        recevied -= balance;
    }

    function _depositToDP(address asset, uint256 amount) internal {
        if (asset == Denominations.ETH) {
            depositPool.deposit{value: amount}();
        } else {
            IERC20(asset).approve(address(depositPool), amount);
            depositPool.depositToken(asset, amount);
        }
    }
    function _authorizeUpgrade(address newImplementation) internal override {}
    receive() external payable {}
}