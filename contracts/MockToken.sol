// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock USDT", "mUSDT") {
        // Tự cấp cho người triển khai 1 triệu token để test
        _mint(msg.sender, 1000000 * 10**18);
    }
}