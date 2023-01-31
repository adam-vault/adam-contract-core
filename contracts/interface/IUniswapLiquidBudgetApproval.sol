// SPDX-License-Identifier: GPL-3.0
// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.5.3. SEE SOURCE BELOW. !!
pragma solidity 0.8.7;

interface IUniswapLiquidBudgetApproval {
    error PairNotSupport(address asset, address base);
    event AllowAddress(address target);
    event AllowAmount(uint256 amount);
    event AllowToToken(address token);
    event AllowToken(address token);
    event ApproveTransaction(
        uint256 indexed id,
        address approver,
        string comment
    );
    event CreateTransaction(
        uint256 indexed id,
        bytes[] data,
        uint256 deadline,
        uint8 status,
        string comment,
        address creator
    );
    event ExecuteTransaction(
        uint256 indexed id,
        bytes[] data,
        address _executor
    );
    event ExecuteUniswapInTransaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );
    event ExecuteUniswapOutTransaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address token,
        uint256 amount
    );
    event ExecuteWETH9Transaction(
        uint256 indexed id,
        address indexed executor,
        address indexed toAddress,
        address tokenIn,
        address tokenOut,
        uint256 amount
    );
    event Initialized(uint8 version);
    event RevokeTransaction(uint256 indexed id);
    event SetApprover(address approver);

    function RECIPIENT_EXECUTEE() external view returns (address);

    function RECIPIENT_UNISWAP_ROUTER() external view returns (address);

    function WETH9() external pure returns (address);

    function accountingSystem() external view returns (address);

    function afterInitialized() external;

    function allowAllToTokens() external view returns (bool);

    function allowAnyAmount() external view returns (bool);

    function allowUnlimitedUsageCount() external view returns (bool);

    function amountPercentage() external view returns (uint8);

    function approveTransaction(uint256 id, string memory comment) external;

    function approverTeamId() external view returns (uint256);

    function approversMapping(address eoa) external view returns (bool);

    function assetBaseCurrencyPrice(address asset, uint256 amount)
        external
        view
        returns (uint256);

    function assetPrice(
        address asset,
        address base,
        uint256 amount
    ) external view returns (uint256);

    function baseCurrency() external view returns (address);

    function baseCurrencyDecimals() external view returns (uint8);

    function canResolvePrice(address asset) external view returns (bool);

    function createTransaction(
        bytes[] memory _data,
        uint32 _deadline,
        bool _isExecute,
        string memory comment
    ) external payable returns (uint256);

    function decodeUniswapMulticall(
        bytes memory rawData,
        uint256 value,
        bytes memory response
    )
        external
        view
        returns (IUniswapSwapper.MulticallData[] memory multicalData);

    function decodeWETH9Call(bytes memory data, uint256 value)
        external
        pure
        returns (
            address tokenIn,
            address tokenOut,
            uint256 amount
        );

    function endTime() external view returns (uint256);

    function exactInput(IIV3SwapRouter.ExactOutputParams memory params)
        external
        pure
        returns (IUniswapSwapper.MulticallData memory);

    function exactInputSingle(
        IIV3SwapRouter.ExactOutputSingleParams memory params
    ) external pure returns (IUniswapSwapper.MulticallData memory);

    function exactOutput(IIV3SwapRouter.ExactOutputParams memory params)
        external
        pure
        returns (IUniswapSwapper.MulticallData memory);

    function exactOutputSingle(
        IIV3SwapRouter.ExactOutputSingleParams memory params
    ) external pure returns (IUniswapSwapper.MulticallData memory);

    function executeParams() external pure returns (string[] memory);

    function executeTransaction(uint256 id) external payable;

    function executee() external view returns (address);

    function executor() external view returns (address);

    function executorTeamId() external view returns (uint256);

    function fromTokens(uint256) external view returns (address);

    function fromTokensMapping(address) external view returns (bool);

    function initialize(
        ICommonBudgetApproval.InitializeParams memory params,
        address[] memory _fromTokens,
        bool _allowAllToTokens,
        address[] memory _toTokens,
        bool _allowAnyAmount,
        uint256 _totalAmount,
        uint8 _amountPercentage,
        address __baseCurrency
    ) external;

    function minApproval() external view returns (uint256);

    function name() external view returns (string memory);

    function refundETH()
        external
        pure
        returns (IUniswapSwapper.MulticallData memory);

    function revokeTransaction(uint256 id) external;

    function selfPermit(
        address,
        uint256,
        uint256,
        uint8,
        bytes32,
        bytes32
    ) external pure returns (IUniswapSwapper.MulticallData memory);

    function startTime() external view returns (uint256);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        address recipient
    ) external pure returns (IUniswapSwapper.MulticallData memory);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] memory path,
        address recipient
    ) external pure returns (IUniswapSwapper.MulticallData memory);

    function sweepToken(
        address token,
        uint256 amountMinimum,
        address recipient
    ) external pure returns (IUniswapSwapper.MulticallData memory);

    function team() external view returns (address);

    function text() external view returns (string memory);

    function toTokensMapping(address) external view returns (bool);

    function totalAmount() external view returns (uint256);

    function transactionType() external view returns (string memory);

    function transactions(uint256)
        external
        view
        returns (
            uint256 id,
            uint8 status,
            uint32 deadline,
            bool isExist,
            uint256 approvedCount
        );

    function unwrapWETH9(uint256 amountMinimum, address recipient)
        external
        pure
        returns (IUniswapSwapper.MulticallData memory);

    function usageCount() external view returns (uint256);
}

interface IUniswapSwapper {
    struct MulticallData {
        address recipient;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint8 resultType;
    }
}

interface IIV3SwapRouter {
    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }
}

interface ICommonBudgetApproval {
    struct InitializeParams {
        address executor;
        uint256 executorTeamId;
        address[] approvers;
        uint256 approverTeamId;
        uint256 minApproval;
        string text;
        string transactionType;
        uint256 startTime;
        uint256 endTime;
        bool allowUnlimitedUsageCount;
        uint256 usageCount;
    }
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"target","type":"address"}],"name":"AllowAddress","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AllowAmount","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowToToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"token","type":"address"}],"name":"AllowToken","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"address","name":"approver","type":"address"},{"indexed":false,"internalType":"string","name":"comment","type":"string"}],"name":"ApproveTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"},{"indexed":false,"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"indexed":false,"internalType":"string","name":"comment","type":"string"},{"indexed":false,"internalType":"address","name":"creator","type":"address"}],"name":"CreateTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bytes[]","name":"data","type":"bytes[]"},{"indexed":false,"internalType":"address","name":"_executor","type":"address"}],"name":"ExecuteTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"executor","type":"address"},{"indexed":true,"internalType":"address","name":"toAddress","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ExecuteUniswapInTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"executor","type":"address"},{"indexed":true,"internalType":"address","name":"toAddress","type":"address"},{"indexed":false,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ExecuteUniswapOutTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"executor","type":"address"},{"indexed":true,"internalType":"address","name":"toAddress","type":"address"},{"indexed":false,"internalType":"address","name":"tokenIn","type":"address"},{"indexed":false,"internalType":"address","name":"tokenOut","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"ExecuteWETH9Transaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"}],"name":"RevokeTransaction","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"approver","type":"address"}],"name":"SetApprover","type":"event"},{"inputs":[],"name":"RECIPIENT_EXECUTEE","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"RECIPIENT_UNISWAP_ROUTER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"accountingSystem","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"afterInitialized","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"allowAllToTokens","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowAnyAmount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowUnlimitedUsageCount","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"amountPercentage","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"comment","type":"string"}],"name":"approveTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"approverTeamId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"eoa","type":"address"}],"name":"approversMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"assetBaseCurrencyPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"address","name":"base","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"assetPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseCurrency","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseCurrencyDecimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"asset","type":"address"}],"name":"canResolvePrice","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"_data","type":"bytes[]"},{"internalType":"uint32","name":"_deadline","type":"uint32"},{"internalType":"bool","name":"_isExecute","type":"bool"},{"internalType":"string","name":"comment","type":"string"}],"name":"createTransaction","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"rawData","type":"bytes"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"response","type":"bytes"}],"name":"decodeUniswapMulticall","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData[]","name":"multicalData","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"data","type":"bytes"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"decodeWETH9Call","outputs":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"endTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"}],"internalType":"struct IIV3SwapRouter.ExactInputParams","name":"params","type":"tuple"}],"name":"exactInput","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IIV3SwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],"name":"exactInputSingle","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"}],"internalType":"struct IIV3SwapRouter.ExactOutputParams","name":"params","type":"tuple"}],"name":"exactOutput","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IIV3SwapRouter.ExactOutputSingleParams","name":"params","type":"tuple"}],"name":"exactOutputSingle","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"executeParams","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"executeTransaction","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"executee","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"executorTeamId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"fromTokens","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"fromTokensMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"executor","type":"address"},{"internalType":"uint256","name":"executorTeamId","type":"uint256"},{"internalType":"address[]","name":"approvers","type":"address[]"},{"internalType":"uint256","name":"approverTeamId","type":"uint256"},{"internalType":"uint256","name":"minApproval","type":"uint256"},{"internalType":"string","name":"text","type":"string"},{"internalType":"string","name":"transactionType","type":"string"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"bool","name":"allowUnlimitedUsageCount","type":"bool"},{"internalType":"uint256","name":"usageCount","type":"uint256"}],"internalType":"struct ICommonBudgetApproval.InitializeParams","name":"params","type":"tuple"},{"internalType":"address[]","name":"_fromTokens","type":"address[]"},{"internalType":"bool","name":"_allowAllToTokens","type":"bool"},{"internalType":"address[]","name":"_toTokens","type":"address[]"},{"internalType":"bool","name":"_allowAnyAmount","type":"bool"},{"internalType":"uint256","name":"_totalAmount","type":"uint256"},{"internalType":"uint8","name":"_amountPercentage","type":"uint8"},{"internalType":"address","name":"__baseCurrency","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"minApproval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"id","type":"uint256"}],"name":"revokeTransaction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint8","name":"","type":"uint8"},{"internalType":"bytes32","name":"","type":"bytes32"},{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"selfPermit","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"startTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"recipient","type":"address"}],"name":"swapExactTokensForTokens","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"recipient","type":"address"}],"name":"swapTokensForExactTokens","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"team","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"text","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"toTokensMapping","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"transactionType","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"transactions","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"enum CommonBudgetApproval.Status","name":"status","type":"uint8"},{"internalType":"uint32","name":"deadline","type":"uint32"},{"internalType":"bool","name":"isExist","type":"bool"},{"internalType":"uint256","name":"approvedCount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[{"components":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"enum UniswapSwapper.MulticallResultAttribute","name":"resultType","type":"uint8"}],"internalType":"struct IUniswapSwapper.MulticallData","name":"","type":"tuple"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"usageCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/
