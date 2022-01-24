// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./interface/IStrategy.sol";
import "./interface/IAssetManager.sol";
import "./interface/IWETH9.sol";

import "./lib/ToString.sol";
import "./base/Manageable.sol";
import "./base/MultiToken.sol";
import "./base/AdamOwned.sol";
import "hardhat/console.sol";


contract AssetManager is MultiToken, Manageable, AdamOwned, IAssetManager, ERC721Holder {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using ToString for address;

    Counters.Counter private _ERC20tokenIds;
    IStrategy[] public strategyList;
    address[] public subscriptionsList;

    mapping(address => bool) public strategies;
    mapping(address => bool) public subscriptions;
    mapping(address => uint) erc20ToTokenId;
    mapping(uint => address) tokenIdToErc20;
    // address constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    string public managerName;

    event SubscribeStrategy(address strategy, address portfolio, uint price);

    constructor(address _adam, address _owner, string memory _managerName) MultiToken("(Adam)") Manageable() {
        setAdam(_adam);
        _initOwner(_owner);
        managerName = _managerName;
    }

    function name() public view returns (string memory) {
        return string(abi.encodePacked(managerName, " Multi-token"));
    }
    function symbol() public view returns (string memory) {
        return string(abi.encodePacked(managerName, "MT"));
    }

    modifier onlyStrategy() {
        require(
            strategies[msg.sender],
            "msg.sender is not strategy"
        );
        _;
    }

    function addStrategy(address _strategy) public onlyAdam override {
        strategyList.push(IStrategy(_strategy));
        strategies[_strategy] = true;
    }
    
    function countStrategy() public view returns (uint) {
        return strategyList.length;
    }
    function deposit(address assetOwner) external onlyStrategy payable override {
        require(msg.value > 0, "please pass ethers");
        _mint(assetOwner, addressToId[address(0)], msg.value, "");
    }

    function depositAnyContract(address _src, address _dst, address[] calldata portfolio, uint256[] calldata amount) public onlyManager {
        uint256 sum = 0;
        for (uint i = 0; i < portfolio.length; i++) {
            uint256 balance = balanceOf(portfolio[i], addressToId[_src]);
            require(balance >= amount[i], "not enough money");
            _swap(portfolio[i], _ERC20tokenId(_src), _ERC20tokenId(_dst), amount[i], amount[i]);
            sum += amount[i];
        }
        IWETH9(_dst).deposit{value: sum}();
    }

    function withdrawAnyContract(address _src, address _dst, address[] calldata portfolio, uint256[] calldata amount) public onlyManager {
        uint256 sum = 0;
        for (uint i = 0; i < portfolio.length; i++) {
            uint256 balance = balanceOf(portfolio[i], addressToId[_src]);
            require(balance >= amount[i], "not enough money");
            _swap(portfolio[i], _ERC20tokenId(_src), _ERC20tokenId(_dst), amount[i], amount[i]);
            sum += amount[i];
        }
        IWETH9(_src).withdraw(sum);
    }

    function _swap(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount ) internal {
        _burn(_portfolio, _src, _srcAmount);
        _mint(_portfolio, _dst, _dstAmount, "");
    }

    function _ERC20tokenId(address contractAddress) public returns (uint256){
        if (addressToId[contractAddress] == 0) {
            _createToken(contractAddress, IERC20Metadata(contractAddress).name(), IERC20Metadata(contractAddress).decimals());
        }
        return addressToId[contractAddress];
    }
    function _ERC721tokenId(address contractAddress) public returns (uint256){
        if (addressToId[contractAddress] == 0) {
            _createToken(contractAddress, IERC20Metadata(contractAddress).name(), 0);
        }
        return addressToId[contractAddress];
    }

    function subscribeStrategy(address src, address strategy, address[] calldata portfolio, uint256[] calldata amount) external payable {
        uint256 sum = 0;
        for (uint i = 0; i < portfolio.length; i++) {
            uint256 balance = balanceOf(portfolio[i], addressToId[src]);
            require(balance >= amount[i], "not enough money");
            _swap(portfolio[i], _ERC20tokenId(src), _ERC721tokenId(strategy), amount[i], amount[i]);
            sum += amount[i];
        }
        address _portfolio = IStrategy(strategy).deposit{value: sum}();
        subscriptions[strategy] = true;
        subscriptionsList.push(strategy);
        emit SubscribeStrategy(strategy, _portfolio, sum);
    }

    function isSubscriptionValid(address target) public view override returns (bool) {
        if(subscriptions[target]) {
            return true;
        }
        bool result = false;
        uint i = 0;
        while (!result && i < subscriptionsList.length) {
            result = IStrategy(subscriptionsList[i]).isSubscriptionValid(target);
            i++;
        }
        return result;
    }

}