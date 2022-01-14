// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./Strategy.sol";
import "./interface/IStrategy.sol";

import "./ToString.sol";
import "./Manageable.sol";
import "./MultiToken.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract AssetManager is MultiToken, Manageable {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;

    Counters.Counter private _tokenIds;
    Strategy[] public strategyList;
    
    mapping(address => bool) public strategies;
    mapping(address => uint) erc20ToTokenId;
    mapping(uint => address) tokenIdToErc20;

    string public managerName;

    constructor(string memory _managerName) MultiToken("(Adam)") Manageable() {
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

    function strategyCount() public view returns (uint) {
        return strategyList.length;
    }

    function createStrategy(string calldata _name) public onlyManager returns (address) {
        Strategy s = new Strategy(_name);
        strategyList.push(s);
        strategies[address(s)] = true;

        return address(s);
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