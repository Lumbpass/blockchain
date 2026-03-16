// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Subscription {
    struct Plan {
        address merchant;
        uint256 amount;
        uint256 frequency; // giây (demo: 60 = 1 phút)
    }

    struct UserSub {
        uint256 lastPayment;
        bool isActive;
    }

    IERC20 public paymentToken; 
    mapping(uint256 => Plan) public plans;
    mapping(address => mapping(uint256 => UserSub)) public userSubs;
    uint256 public planCount;

    constructor(address _tokenAddress) {
        paymentToken = IERC20(_tokenAddress);
    }

    // 1. Merchant tạo gói
    function createPlan(uint256 _amount, uint256 _frequency) external {
        plans[planCount] = Plan(msg.sender, _amount, _frequency);
        planCount++;
    }

    // 2. Người dùng đăng ký (Phải Approve Token trước khi gọi cái này)
    function subscribe(uint256 _planId) external {
        Plan storage plan = plans[_planId];
        require(paymentToken.transferFrom(msg.sender, plan.merchant, plan.amount), "Loi: Khong tru duoc tien");
        userSubs[msg.sender][_planId] = UserSub(block.timestamp, true);
    }

    // 3. Hàm hệ thống tự động gọi để thu tiền khi đến hạn
    function executePayment(address _subscriber, uint256 _planId) external {
        Plan storage plan = plans[_planId];
        UserSub storage sub = userSubs[_subscriber][_planId];

        require(sub.isActive, "Goi chua duoc dang ky");
        require(block.timestamp >= sub.lastPayment + plan.frequency, "Chua den han thanh toan");

        sub.lastPayment = block.timestamp;
        require(paymentToken.transferFrom(_subscriber, plan.merchant, plan.amount), "Loi: Vi nguoi dung khong du tien");
    }
}