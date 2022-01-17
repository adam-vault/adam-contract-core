// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interface/IStrategy.sol";
import "./interface/IAssetManager.sol";

import "./lib/ToString.sol";
import "./base/Manageable.sol";
import "./base/MultiToken.sol";


contract AssetManager is MultiToken, Manageable {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;

    Counters.Counter private _tokenIds;
    IStrategy[] public strategyList;
    
    mapping(address => bool) public strategies;
    mapping(address => uint) erc20ToTokenId;
    mapping(uint => address) tokenIdToErc20;

    string public managerName;

    constructor(address _owner, string memory _managerName) MultiToken("(Adam)") Manageable() {
        _initOwner(_owner);
        managerName = _managerName;
    }

    function name() public view returns (string memory) {
        return string(abi.encodePacked(managerName, " Multi-token"));
    }

    modifier onlyStrategy() {
        require(
            strategies[msg.sender],
            "msg.sender is not strategy"
        );
        _;
    }

    modifier onlyAdam() {
        require(
            strategies[msg.sender],
            "msg.sender is not strategy"
        );
        _;
    }
    function addStrategy(address _strategy) public onlyAdam {
        strategyList.push(IStrategy(_strategy));
    }
    
    function strategyCount() public view returns (uint) {
        return strategyList.length;
    }
    function deposit(address assetOwner) external onlyStrategy payable {
        require(msg.value > 0, "please pass ethers");
        _mint(assetOwner, addressToId[address(0)], msg.value, "");
    }

    // function joinStrategy(address strategy) external payable {
    //     IStrategy s = IStrategy(strategy);
    //     s.deposit{value: msg.value}();
    // }
}