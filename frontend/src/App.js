import React, { useState, useEffect } from 'react';
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

    const loadBlockchainData = async () => {
      if (contract && account) {
        try {
      // 1. Lấy danh sách gói cước đang hoạt động
          const activePkgs = await contract.getActivePackages();
          setActivePackages(activePkgs);

      // 2. Lấy ngày hết hạn cho từng gói của ví hiện tại
          const expiries = {};
        for (const pkg of activePkgs) {
        // Gọi mapping expiry(address, uint256) từ contract
        const expirationTimestamp = await contract.expiry(account, pkg.id);
        expiries[pkg.id.toString()] = Number(expirationTimestamp);
        }
        setUserExpiries(expiries);

      // 3. Nếu là Admin thì lấy thêm gói chờ duyệt
        if (role === 'ADMIN') {
          const pendingPkgs = await contract.getPendingPackages();
          setPendingPackages(pendingPkgs);
        }
      } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      }
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (contract && role) {
      loadBlockchainData();
    }
  }, [contract, role]);

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

  const handleSubscribeP2P = async (packageId, priceInWei) => {
    try {
      alert("Vui lòng xác nhận cấp quyền trừ tiền ảo (USDT)...");
      const approveTx = await tokenContract.approve(SUBSCRIPTION_ADDRESS, priceInWei);
      await approveTx.wait();

      alert("Tiền ảo đã được cấp quyền. Vui lòng xác nhận thanh toán trực tiếp...");
      const subTx = await contract.subscribeToPackage(packageId);
      await subTx.wait();

      alert("🎉 Đăng ký gói cước và thanh toán trực tiếp cho Người bán thành công!");
      loadBlockchainData(); 
    } catch (error) { console.error(error); alert("Giao dịch thanh toán thất bại."); }
  };

  const AdminView = () => (
    <div className="role-view">
      <h3>Giao diện Quản trị viên (ADMIN) - Duyệt gói cước rác</h3>
      {pendingPackages.length === 0 && <p>Không có gói cước nào chờ duyệt.</p>}
      {pendingPackages.map(pkg => (
        <div key={pkg.id.toString()} className="package-card pending">
          <h4>Gói: {pkg.name}</h4>
          <p>Giá: {ethers.formatEther(pkg.price)} USDT</p>
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
      <h3>Giao diện Người mua (BUYER) - Đăng ký gói cước P2P</h3>
      {activePackages.length === 0 && <p>Chưa có gói cước nào được rao bán.</p>}
      {activePackages.map(pkg => (
        <div key={pkg.id.toString()} className="package-card active">
          <h4>{pkg.name}</h4>
          <p className="price">{ethers.formatEther(pkg.price)} USDT</p>
          <p className="seller">Bán bởi: {pkg.seller.substring(0,6)}...{pkg.seller.substring(38)}</p>
          <button onClick={() => handleSubscribeP2P(pkg.id, pkg.price)} className="btn-subscribe">Đăng ký & Thanh toán</button>
        </div>
      ))}
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
                <b>{pkg.name}</b>: {ethers.formatEther(pkg.price)} USDT
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;