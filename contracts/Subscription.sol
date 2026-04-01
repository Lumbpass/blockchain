// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Subscription {
    IERC20 public token;
    address public admin;

    enum PackageStatus { Pending, Active, Rejected }

    struct Package {
        uint256 id;
        string name;
        uint256 price; // Giá tính theo Wei (ví dụ 10*10^18 là 10 USDT)
        address payable seller; // Ví người bán nhận tiền
        PackageStatus status; // Trạng thái phê duyệt
    }

    // Mapping từ ID gói cước đến thông tin gói cước
    mapping(uint256 => Package) public packages;
    uint256 public packageCount;

    // Mapping để kiểm tra người dùng đã mua gói nào chưa
    // mapping(ví người mua => mapping(id gói => trạng thái))
    mapping(address => mapping(uint256 => bool)) public hasAccess;

    event PackageCreated(uint256 indexed id, string name, uint256 price, address indexed seller);
    event PackageApproved(uint256 indexed id);
    event Subscribed(address indexed buyer, uint256 indexed packageId, address indexed seller);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Chi Admin moi co quyen");
        _;
    }

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
        admin = msg.sender; // Người deploy là Admin mặc định
    }

    // [CHỨC NĂNG ĐỘNG CHO SELLER]: Tạo gói mới chờ duyệt
    function createPackage(string memory _name, uint256 _price) public {
        require(_price > 0, "Gia phai lon hon 0");
        packageCount++;
        packages[packageCount] = Package({
            id: packageCount,
            name: _name,
            price: _price,
            seller: payable(msg.sender),
            status: PackageStatus.Pending // Mặc định chờ duyệt
        });
        emit PackageCreated(packageCount, _name, _price, msg.sender);
    }

    // [CHỨC NĂNG CHO ADMIN]: Duyệt gói cước để hiển thị
    function approvePackage(uint256 _packageId) public onlyAdmin {
        require(packages[_packageId].id > 0, "Goi cuoc ko ton tai");
        require(packages[_packageId].status == PackageStatus.Pending, "Goi cuoc ko o trang thai cho duyet");
        
        packages[_packageId].status = PackageStatus.Active;
        emit PackageApproved(_packageId);
    }

    // [CHỨC NĂNG ĐỘNG CHO BUYER]: Đăng ký và CHUYỂN TIỀN TRỰC TIẾP CHO SELLER
    mapping(address => mapping(uint256 => uint256)) public expiry; // Lưu timestamp hết hạn

    function subscribeToPackage(uint256 _packageId) public {
        Package storage pkg = packages[_packageId];
        require(pkg.status == PackageStatus.Active, "Goi ko san sang");
    
    // KIỂM TRA: Nếu gói vẫn còn hạn thì không cho mua tiếp
        require(block.timestamp > expiry[msg.sender][_packageId], "Goi cuoc nay cua ban van dang con han su dung");

        bool success = token.transferFrom(msg.sender, pkg.seller, pkg.price);
        require(success, "Thanh toan that bai");

    // Cập nhật hạn dùng: Thời điểm hiện tại + 30 ngày
        expiry[msg.sender][_packageId] = block.timestamp + 30 days;
    
        emit Subscribed(msg.sender, _packageId, pkg.seller);
    }

    // Hàm hỗ trợ Frontend lấy danh sách gói cước Active
    function getActivePackages() public view returns (Package[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= packageCount; i++) {
            if (packages[i].status == PackageStatus.Active) {
                activeCount++;
            }
        }

        Package[] memory activePkgs = new Package[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= packageCount; i++) {
            if (packages[i].status == PackageStatus.Active) {
                activePkgs[currentIndex] = packages[i];
                currentIndex++;
            }
        }
        return activePkgs;
    }

    // Hàm hỗ trợ Admin lấy danh sách gói cước Pending
    function getPendingPackages() public view onlyAdmin returns (Package[] memory) {
        // Tương tự như trên nhưng lọc status == Pending
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= packageCount; i++) {
            if (packages[i].status == PackageStatus.Pending) {
                pendingCount++;
            }
        }

        Package[] memory pendingPkgs = new Package[](pendingCount);
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= packageCount; i++) {
            if (packages[i].status == PackageStatus.Pending) {
                pendingPkgs[currentIndex] = packages[i];
                currentIndex++;
            }
        }
        return pendingPkgs;
    }

    
}