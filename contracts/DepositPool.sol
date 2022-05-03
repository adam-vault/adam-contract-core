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

import "./interface/IDao.sol";
import "./lib/ToString.sol";
import "./lib/Base64.sol";
import "./lib/Concat.sol";

contract DepositPool is Initializable, UUPSUpgradeable, ERC1155Upgradeable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Strings for uint8;
    using ToString for address;
    using Base64 for bytes;
    using Concat for string;

    IDao public dao;
    FeedRegistryInterface public registry;
    Counters.Counter private _tokenIds;
    mapping(uint256 => address) public contractAddress;
    mapping(address => uint256) public id;
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
        registry = FeedRegistryInterface(feedRegistry);
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

    function assetEthPrice(address asset, uint256 amount) public view returns (uint256) {
        (, int price,,,) = registry.latestRoundData(asset, Denominations.ETH);
        if (price > 0) {
            return uint256(price) * amount / 10 ** IERC20Metadata(asset).decimals();
        }
        return 0;
    }
    function canAddAsset(address asset) public view returns (bool) {
        if (asset == Denominations.ETH)
            return true;
        try registry.getFeed(asset, Denominations.ETH) {
            return true;
        } catch (bytes memory /*lowLevelData*/) {
            return false;
        }
    }

    function canCreateBudgetApproval(address budgetApproval) public view returns (bool) {
        return dao.budgetApprovals(budgetApproval);
    }

    function deposit() public payable {
        require(isAssetSupported[Denominations.ETH], "asset not support");
        require(msg.value > 0, "cannot be 0");
        totalSupply[Denominations.ETH] += msg.value;
        _mint(msg.sender, id[Denominations.ETH], msg.value, "");
        _afterDeposit(msg.sender, msg.value);
    }

    function depositToken(address asset, uint256 amount) public {
        require(isAssetSupported[asset], "asset not support");
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        totalSupply[asset] += amount;
        _mint(msg.sender, id[asset], amount, "");
        _afterDeposit(msg.sender, assetEthPrice(asset, amount));
    }

    function withdraw(address asset, uint256 amount) public {
        require(amount <= balanceOf(msg.sender, id[asset]), "not enough balance");
        require(dao.firstDeposit(msg.sender) + dao.locktime() <= block.timestamp, "lockup time");
        _burn(msg.sender, id[asset], amount);
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
        if (id[asset] == 0) {
            _tokenIds.increment();
            id[asset] = _tokenIds.current();
            contractAddress[_tokenIds.current()] = asset;
            emit CreateToken(_tokenIds.current(), asset);
        }

        isAssetSupported[asset] = true;
        emit AllowDepositToken(id[asset], asset);
    }

    function _afterDeposit(address account, uint256 eth) private {
        if (dao.firstDeposit(account) == 0) {
            dao.setFirstDeposit(account);

            require(eth >= dao.minDepositAmount(), "deposit amount not enough");
            if (!dao.isMember(account)) {
                require(IERC20(dao.memberToken()).balanceOf(account) >= dao.minMemberTokenToJoin(), "member token not enough");
                dao.mintMember(account);
            }
        }

    }
    function _authorizeUpgrade(address newImplementation) internal override initializer {}

}