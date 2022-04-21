const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log(`
    ${process.env.MEMBERSHIP_IMPLEMENTATION}
    ${process.env.ADAM}
    ${process.env.TRANSFER_ERC20_APPROVAL_IMPLEMENTATION}
    ${process.env.UNISWAP_APPROVAL_IMPLEMENTATION}
    ${process.env.GOVERN_FACTORY}
    ${process.env.GOVERN_IMPLEMENTATION}
    ${process.env.DAO_IMPLEMENTATION}
    ${process.env.DAO_LOCK_TIME_0}
    ${process.env.DAO_LOCK_TIME_100_A}
    ${process.env.DAO_LOCK_TIME_100_B}
    ${process.env.DAO_LOCK_TIME_100_C}
`);
