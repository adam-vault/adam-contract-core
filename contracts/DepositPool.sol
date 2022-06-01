// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/Denominations.sol";
import "@chainlink/contracts/src/v0.8/interfaces/FeedRegistryInterface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

import "./interface/IDao.sol";
import "./base/PriceResolver.sol";
import "./lib/ToString.sol";
import "./lib/Base64.sol";
import "./lib/Concat.sol";

contract DepositPool is Initializable, UUPSUpgradeable, ERC1155Upgradeable, PriceResolver {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Strings for uint8;
    using ToString for address;
    using Base64 for bytes;
    using Concat for string;

    IDao public dao;
    Counters.Counter private _tokenIds;
    mapping(uint256 => address) public contractAddress;
    mapping(address => uint256) public idOf;
    mapping(address => uint256) public totalSupply;
    mapping(address => bool) public isAssetSupported;

    event CreateToken(uint256 id, address contractAddress);
    event AllowDepositToken(uint256 id, address contractAddress);
    event DisallowDepositToken(uint256 id, address contractAddress);

    modifier onlyDao() {
        require(msg.sender == address(dao), "not dao");
        _;
    }
    function initialize(address owner, address feedRegistry, address[] memory depositTokens) public initializer {
        __ERC1155_init("");
        dao = IDao(payable(owner));
        _addAsset(Denominations.ETH);
        _addAssets(depositTokens);
    }

    function name(address asset) public view returns (string memory) {
        if (asset == Denominations.ETH) return "ETH";
        return IERC20Metadata(asset).name();
    }

    function decimals(address asset) public view returns (uint8) {
        if (asset == Denominations.ETH) return 18;
        try IERC20Metadata(asset).decimals() returns (uint8 _decimals) {
            return _decimals;
        } catch {
            return 0;
        }
    }
    function uri(uint256 _id) public view override returns (string memory) {
        string memory metadata = string(abi.encodePacked(
            "{\"name\": \"",
            name(contractAddress[_id]),
            "\", \"decimals\": ",
            decimals(contractAddress[_id]).toString(),
            ", \"totalSupply\": ",
            totalSupply[contractAddress[_id]].toString(),
            ", \"description\": \"\", \"attributes\":",
            "[{\"key\":\"address\",\"value\":\"",
            contractAddress[_id].toString(),
            "\"}]",
            "}"
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(metadata).base64()
        ));
    }

    function canAddAsset(address asset) public view returns (bool) {
        return canResolvePrice(asset);
    }

    function canCreateBudgetApproval(address budgetApproval) public view returns (bool) {
        return dao.budgetApprovals(budgetApproval);
    }

    function deposit() public payable {
        require(isAssetSupported[Denominations.ETH], "asset not support");
        require(msg.value > 0, "cannot be 0");
        totalSupply[Denominations.ETH] += msg.value;
        _mint(msg.sender, idOf[Denominations.ETH], msg.value, "");
        _afterDeposit(msg.sender, msg.value);
    }

    function depositToken(address asset, uint256 amount) public {
        require(isAssetSupported[asset], "asset not support");
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        totalSupply[asset] += amount;
        _mint(msg.sender, idOf[asset], amount, "");
        _afterDeposit(msg.sender, assetEthPrice(asset, amount));
    }

    function withdraw(address asset, uint256 amount) public {
        require(amount <= balanceOf(msg.sender, idOf[asset]), "not enough balance");
        require(dao.firstDepositTime(msg.sender) + dao.locktime() <= block.timestamp, "lockup time");
        _burn(msg.sender, idOf[asset], amount);
        totalSupply[asset] -= amount;

        if (asset == Denominations.ETH) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(asset).transfer(msg.sender, amount);
        }
    }

    function addAssets(address[] calldata erc20s) public onlyDao {
        _addAssets(erc20s);
    }

    function _addAssets(address[] memory erc20s) internal {
        for (uint256 i = 0; i < erc20s.length; i++) {
            _addAsset(erc20s[i]);
        }
    }

    function _addAsset(address asset) internal {
        require(canAddAsset(asset) && !isAssetSupported[asset], "Asset not support");
        if (idOf[asset] == 0) {
            _tokenIds.increment();
            idOf[asset] = _tokenIds.current();
            contractAddress[_tokenIds.current()] = asset;
            emit CreateToken(_tokenIds.current(), asset);
        }

        isAssetSupported[asset] = true;
        emit AllowDepositToken(idOf[asset], asset);
    }

    function _afterDeposit(address account, uint256 eth) private {
        if (dao.isOptInPool(account))
            return;
        if (dao.firstDepositTime(account) == 0) {
            dao.setFirstDepositTime(account);

            require(eth >= dao.minDepositAmount(), "deposit amount not enough");
            
            if (dao.isMember(account)) {
                return;
            }
            if(dao.minTokenToAdmit() > 0 ){
                bytes4 sector = bytes4(keccak256("balanceOf(address)"));
                bytes memory data = abi.encodeWithSelector(sector, account);
                (, bytes memory result) = address(dao.admissionToken()).call(data);
                
                uint256 balance = abi.decode(result,(uint256));
                require(balance >= dao.minTokenToAdmit(), "Admission token not enough");
            }
            dao.mintMember(account);
        }
    }
    function _authorizeUpgrade(address newImplementation) internal override initializer {}

}