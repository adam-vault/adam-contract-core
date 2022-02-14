// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "./interface/IStrategy.sol";
import "./interface/IAssetManager.sol";
import "./interface/IWETH9.sol";
import "./interface/ITreasury.sol";

import "./lib/Concat.sol";

import "./base/AdamOwned.sol";
import "./base/Manageable.sol";
import "./base/MultiToken.sol";
import "./base/AdamOwned.sol";
import "hardhat/console.sol";

import "./lib/ToString.sol";
import "./dex/UniswapSwapper.sol";

contract AssetManager is Initializable, UUPSUpgradeable, MultiToken, Manageable, IAssetManager, ERC721HolderUpgradeable, AdamOwned {
    // list strategy
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Concat for string;

    Counters.Counter private _ERC20tokenIds;
    IStrategy[] public strategyList;
    address[] public subscriptionsList;

    mapping(address => bool) public strategies;
    mapping(address => bool) public subscriptions;
    mapping(address => uint) erc20ToTokenId;
    mapping(uint => address) tokenIdToErc20;

    string public managerName;

    address public constant UNISWAP_ROUTER = 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45;
    address public constant WETH9 = 0xc778417E063141139Fce010982780140Aa0cD5Ab;

    event SubscribeStrategy(address strategy, address portfolio, uint price);

    function initialize(address _adam, address _owner, string memory _managerName) public override initializer {
        __ERC721Holder_init();
        __MultiToken_init(" (Adam)");
        _initOwner(_owner);
        setAdam(_adam);
        managerName = _managerName;
    }

    function name() public view returns (string memory) {
        return managerName.concat(" Multi-token");
    }
    function symbol() public view returns (string memory) {
        return managerName.concat(" MT");
    }

    modifier onlyStrategy() {
        require(strategies[msg.sender], "msg.sender is not strategy");
        _;
    }

    function addStrategy(address _strategy) public override onlyAdam {
        strategyList.push(IStrategy(_strategy));
        strategies[_strategy] = true;
    }
    
    function countStrategy() public view returns (uint) {
        return strategyList.length;
    }
    function deposit(address assetOwner) external onlyStrategy payable override {
        require(msg.value > 0, "please pass ethers");
        _mintToken(assetOwner, ethId, msg.value, "");
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
        IWETH9(_dst).withdraw(sum);
    }

    function _swap(address _portfolio, uint256 _src, uint256 _dst, uint256 _srcAmount, uint256 _dstAmount ) internal {
        _burnToken(_portfolio, _src, _srcAmount);
        _mintToken(_portfolio, _dst, _dstAmount, "");
    }

    function _ERC20tokenId(address contractAddress) public returns (uint256){
        if (!contractRegistered(contractAddress)) {
            _createToken(contractAddress, IERC20Metadata(contractAddress).name(), IERC20Metadata(contractAddress).decimals());
        }
        return addressToId[contractAddress];
    }
    function _ERC721tokenId(address contractAddress) public returns (uint256){
        if (!contractRegistered(contractAddress)) {
            _createToken(contractAddress, IERC20Metadata(contractAddress).name(), 0);
        }
        return addressToId[contractAddress];
    }

    function contractRegistered(address contractAddress) public view returns (bool) {
        return addressToId[contractAddress] != 0;
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

    function approve(ERC20 token, address spender, uint256 amount) external onlyOwner returns (bool) {
        return token.approve(spender, amount);
    }


    function chargeManagementFee(address token, address strategyMgtFeeAddr) external onlyOwner returns (bool) {
        // expect to have tokens and ethers

        // For development
        _createToken(token, "A", 18);
        _createToken(token, "A", 18);

        _mintToken(strategyMgtFeeAddr, 1, 10*10**18, "");
        _mintToken(strategyMgtFeeAddr, 2, 5*10**18, "");
        _mintToken(strategyMgtFeeAddr, 3, 5*10**18, "");

        // For demo
        // _createToken(token, "LINK", 18);
        // _mintToken(strategyMgtFeeAddr, 1, 1*10**16, "");
        // _mintToken(strategyMgtFeeAddr, 2, 1*10**16, "");
        return true;
    }

    function redeemManagementFee(address mgtFeeAccount, address to) external override onlyStrategy returns (bool) {
        address treasury = IAdam(adam()).treasury();

        for (uint i = 1; i < _tokenIds.current() + 1; i++) {
            uint mgtFee = balanceOf(mgtFeeAccount, i);

            // special handle for ether
            if (mgtFee > 0 && i == 1) {
                _burn(mgtFeeAccount, i, mgtFee);
                ITreasury(treasury).exchangeEVE{ value: mgtFee }(to, contractAddress(i), 0);
            }

            if (mgtFee > 0 && i != 1) {
                _burn(mgtFeeAccount, i, mgtFee);
                ITreasury(treasury).exchangeEVE(to, contractAddress(i), mgtFee);
            }
        }

        return true;
    }

    function _authorizeUpgrade(address newImplementation) internal override {}

    // TODO: add onlyOwner
    function execSwapTransaction(address to, bytes memory _data, uint256 value, address[] calldata portfolio) external {
        
        (bool success, bytes memory results) = to.call{ value: value }(_data);

        require(success == true, "Failed");
        
        if(to == UNISWAP_ROUTER) {
            // Uniswap Swap Router
            (bytes[] memory decodedResults) = abi.decode(results, (bytes[]));

            (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, bool estimatedIn, bool estimatedOut) = UniswapSwapper._decodeUniswapRouter(_data, decodedResults, value);
            if(estimatedIn == true || estimatedOut == true) {
                revert("Unexpected");
            }

            // TODO: handle multiple portfolio
            _swap(portfolio[0], _ERC20tokenId(tokenIn), _ERC20tokenId(tokenOut), amountIn, amountOut);

        } else if (to == WETH9) {
            // WETH9
            (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut) = UniswapSwapper._decodeWETH9(_data, value);

            // TODO: handle multiple portfolio
            _swap(portfolio[0], _ERC20tokenId(tokenIn), _ERC20tokenId(tokenOut), amountIn, amountOut);

        } else {
            revert("Unexpected");
        }

    }

    receive() external payable {}
}