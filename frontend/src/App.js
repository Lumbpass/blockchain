import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import Login from './Login';
import { SUBSCRIPTION_ADDRESS, TOKEN_ADDRESS } from './config';
import SubscriptionABI from './abis/Subscription.json'; 
import TokenABI from './abis/MockToken.json';
import './App.css';

 

function App() {
  const [role, setRole] = useState(null); // Quản lý chuyển trang
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [activePackages, setActivePackages] = useState([]);
  const [pendingPackages, setPendingPackages] = useState([]);
  const [myPurchasedPackages, setMyPurchasedPackages] = useState([]);

  const [newPackageName, setNewPackageName] = useState('');
  const [newPackagePrice, setNewPackagePrice] = useState('');

  const [userExpiries, setUserExpiries] = useState({}); 

  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());

      const subContract = new ethers.Contract(SUBSCRIPTION_ADDRESS, SubscriptionABI.abi, signer);
      const tkContract = new ethers.Contract(TOKEN_ADDRESS, TokenABI.abi, signer);
      setContract(subContract);
      setTokenContract(tkContract);
    }
  };

    const loadBlockchainData = useCallback(async () => {
    if (contract && account) {
      try {
      // 1. Lấy tất cả gói cước từ Smart Contract
       const allPkgs = await contract.getAllPackages(); 
      
      // 2. Lọc và định dạng danh sách gói đang hoạt động (Active)
      const formattedActive = allPkgs
        .filter(pkg => Number(pkg.status) === 1) // 1 là Active
        .map(pkg => {
        const rawPriceStr = pkg.price.toString().split('.')[0]; 
    
        return {
          id: Number(pkg.id),
          name: pkg.name,
          price: ethers.formatUnits(rawPriceStr, 18),
          rawPrice: rawPriceStr,
          seller: pkg.seller
        }; 
      }); 

      setActivePackages(formattedActive);

      // 3. Lấy danh sách ID các gói người dùng này đã mua
      const myIds = await contract.getMyPackages(); 
      // Chuyển myIds sang dạng Number để dễ so sánh (vì từ contract về có thể là BigInt)
      const myIdsNumbers = myIds.map(id => Number(id));

      const purchasedList = [];
      const expiries = {};

      for (const pkg of formattedActive) {
        const pkgId = pkg.id;
        
        // Lấy ngày hết hạn từ mapping expiry(address, uint256)
        const expirationTimestamp = await contract.expiry(account, pkgId);
        expiries[pkgId.toString()] = Number(expirationTimestamp);

        // Kiểm tra xem ID gói này có nằm trong danh sách đã mua không
        if (myIdsNumbers.includes(pkgId)) {
          purchasedList.push({
            ...pkg,
            expiryDate: Number(expirationTimestamp)
          });
        }
      }
      
      setUserExpiries(expiries);
      setMyPurchasedPackages(purchasedList);

      // 4. Nếu là Admin thì lấy thêm gói chờ duyệt (Pending)
      if (role === 'ADMIN') {
        const pendingPkgs = await contract.getPendingPackages();
        setPendingPackages(pendingPkgs);
        }
      } catch (error) {
      console.error("Lỗi khi tải dữ liệu Blockchain:", error);
      }
    }
}, [contract, account, role]);

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (contract && role) {
      loadBlockchainData();
    }
  }, [contract, role, loadBlockchainData]);

  const handleCreatePackage = async () => {
    if (!newPackageName || !newPackagePrice) return alert("Vui lòng điền đủ tên và giá");
    try {
      const priceInWei = ethers.parseEther(newPackagePrice); 
      const tx = await contract.createPackage(newPackageName, priceInWei);
      await tx.wait(); 
      alert("Đăng gói cước thành công! Đang chờ Admin phê duyệt.");
      setNewPackageName(''); setNewPackagePrice('');
      loadBlockchainData(); 
    } catch (error) { console.error(error); alert("Lỗi khi tạo gói cước"); }
  };

  const handleApprovePackage = async (packageId) => {
    try {
      const tx = await contract.approvePackage(packageId);
      await tx.wait();
      alert(`Đã duyệt gói cước ID: ${packageId} thành công!`);
      loadBlockchainData(); 
    } catch (error) { console.error(error); alert("Lỗi khi duyệt gói cước"); }
  };

  const handleSubscribeP2P = async (packageId, rawPrice) => {
    try {
      // Kiểm tra hạn sử dụng trước khi cho phép mua
      const currentExpiry = userExpiries[packageId.toString()] || 0;
      const now = Math.floor(Date.now() / 1000);
      if (currentExpiry > now) {
        return alert("Gói cước này vẫn còn hạn, bạn không cần mua lại ngay lúc này!");
      }

      alert("Bước 1: Xác nhận cấp quyền (Approve) cho hệ thống trừ USDT...");
      // Dùng trực tiếp tokenContract đã set ở state
      const approveTx = await tokenContract.approve(SUBSCRIPTION_ADDRESS, rawPrice);
      await approveTx.wait(); // Đợi block lưu giao dịch approve

      alert("Bước 2: Xác nhận thanh toán trực tiếp cho Người bán...");
      const subTx = await contract.subscribeToPackage(packageId);
      await subTx.wait(); // Đợi block lưu giao dịch thanh toán

      alert("🎉 Đăng ký thành công!");
      loadBlockchainData(); // Cập nhật lại giao diện
    } catch (error) {
      console.error("Lỗi giao dịch:", error);
      alert("Giao dịch thất bại. Hãy kiểm tra số dư hoặc MetaMask.");
    }
  };

  const AdminView = () => (
    <div className="role-view">
      <h3>Giao diện Quản trị viên (ADMIN) - Duyệt gói cước rác</h3>
      {pendingPackages.length === 0 && <p>Không có gói cước nào chờ duyệt.</p>}
      {pendingPackages.map(pkg => (
        <div key={pkg.id.toString()} className="package-card pending">
          <h4>Gói: {pkg.name}</h4>
          <p>Giá: {pkg.price} USDT</p>
          <p>Người bán: {pkg.seller.substring(0,6)}...{pkg.seller.substring(38)}</p>
          <button onClick={() => handleApprovePackage(pkg.id)} className="btn-approve-pkg">Phê duyệt (Duyệt)</button>
        </div>
      ))}
    </div>
  );

  const SellerView = () => (
    <div className="role-view">
      <h3>Giao diện Người bán (SELLER) - Đăng gói cước mới</h3>
      <div className="create-package-form">
        <input type="text" placeholder="Tên gói cước" value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} />
        <input type="number" placeholder="Giá (ví dụ: 10 USDT)" value={newPackagePrice} onChange={(e) => setNewPackagePrice(e.target.value)} />
        <button onClick={handleCreatePackage} className="btn-create-pkg">Đăng gói mới chờ duyệt</button>
      </div>
    </div>
  );

  const BuyerView = () => (
  <div className="role-view">
    {/* PHẦN 1: DỊCH VỤ ĐANG SỬ DỤNG (LỊCH SỬ) */}
    <div className="my-history-section">
      <h3>Dịch vụ tôi đang sử dụng</h3>
      {myPurchasedPackages.length === 0 ? (
        <p>Bạn chưa mua gói nào.</p>
      ) : (
        myPurchasedPackages.map((pkg) => (
          <div key={pkg.id.toString()} className="package-card purchased">
            <h4>✅ {pkg.name}</h4>
            <p>
              Hạn dùng: {userExpiries[pkg.id.toString()] 
                ? new Date(userExpiries[pkg.id.toString()] * 1000).toLocaleString() 
                : "Đang tải..."}
            </p>
          </div>
        ))
      )}
    </div>
    
    <hr />
    
    {/* PHẦN 2: CỬA HÀNG (DANH SÁCH MUA) */}
    <h3>Cửa hàng gói cước P2P</h3>
    <div className="package-grid">
      {activePackages.map((pkg) => (
        <div key={pkg.id.toString()} className="package-card active">
          <h4>{pkg.name}</h4>
          {/* Hiển thị trực tiếp pkg.price đã format ở loadBlockchainData */}
          <p className="price">{pkg.price} USDT</p> 
          <button 
            onClick={() => handleSubscribeP2P(pkg.id, pkg.rawPrice)} 
            className="btn-subscribe"
          >
            Đăng ký ngay
          </button>
        </div>
      ))}
    </div>
  </div>
);

  // LOGIC CHUYỂN TRANG (Không cần Router)
  if (!role) {
    return <Login setRole={setRole} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hệ thống Thanh toán Gói cước Blockchain</h1>
        {account && <p className="wallet-info">Ví kết nối: {account.substring(0,6)}...{account.substring(38)} ({role})</p>}
        <button onClick={() => setRole(null)} className="btn-logout">Đăng xuất</button>
      </header>
      
      <div className="dashboard-container">
        {role === 'ADMIN' && <AdminView />}
        {role === 'SELLER' && <SellerView />}
        {role === 'BUYER' && <BuyerView />}
        
        {role !== 'BUYER' && (
          <div className="all-active-packages">
            <h3>Danh sách các gói cước đang hoạt động</h3>
            {activePackages.map(pkg => (
              <div key={pkg.id.toString()} className="pkg-mini-card">
                <b>{pkg.name}</b>: {pkg.price} USDT
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;