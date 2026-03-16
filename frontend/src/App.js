import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Import địa chỉ và ABI
import { TOKEN_ADDRESS, SUBSCRIPTION_ADDRESS } from './config';
import TokenData from './abis/MockToken.json';
import SubData from './abis/Subscription.json';

function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [status, setStatus] = useState("Sẵn sàng");
  

  // 1. Hàm Kết nối Ví
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const userSigner = await provider.getSigner();
        const address = await userSigner.getAddress();
        
        setSigner(userSigner);
        setAccount(address);
        setStatus("Đã kết nối ví");
      } catch (err) {
        console.error(err);
        setStatus("Lỗi kết nối ví");
      }
    } else {
      alert("Hãy cài đặt MetaMask!");
    }
  };

  // 2. Bước 1: Approve (Cho phép Contract rút tiền)
  const handleApprove = async () => {
    try {
      setStatus("Đang chờ phê duyệt (Approve)...");
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TokenData.abi, signer);
      
      // Cho phép rút 100 Token (điều chỉnh tùy ý)
      const amount = ethers.parseEther("100");
      const tx = await tokenContract.approve(SUBSCRIPTION_ADDRESS, amount);
      
      await tx.wait(); // Chờ giao dịch thành công trên Blockchain
      setStatus("Đã Approve thành công! Giờ hãy Subscribe.");
    } catch (err) {
      console.error(err);
      setStatus("Lỗi khi Approve");
    }
  };

  // 3. Bước 2: Subscribe (Đăng ký gói ID 0)
  const handleSubscribe = async () => {
    try {
      setStatus("Đang đăng ký (Subscribe)...");
      const subContract = new ethers.Contract(SUBSCRIPTION_ADDRESS, SubData.abi, signer);
      
      // Giả sử bạn đăng ký Plan ID là 0 (Bạn cần tạo Plan trước nếu chưa có)
      const tx = await subContract.subscribe(0);
      
      await tx.wait();
      setStatus("Chúc mừng! Bạn đã đăng ký thành công.");
    } catch (err) {
      console.error(err);
      setStatus("Lỗi: Có thể bạn chưa tạo Plan hoặc không đủ tiền.");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial", textAlign: "center" }}>
      <h1 style={{ color: "#2c3e50" }}>DApp Thanh Toán Định Kỳ</h1>
      <p>Trạng thái: <strong>{status}</strong></p>

      {!account ? (
        <button onClick={connectWallet} style={btnStyle}>Kết nối MetaMask</button>
      ) : (
        <div>
          <p>Ví của bạn: {account}</p>
          <hr />
          
          <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
            <div style={cardStyle}>
              <h3>Gói Premium (10 USDT/phút)</h3>
              <button onClick={handleApprove} style={stepBtnStyle}>Bước 1: Approve Token</button>
              <br /><br />
              <button onClick={handleSubscribe} style={mainBtnStyle}>Bước 2: Subscribe Ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CSS Inline cho nhanh
const btnStyle = { padding: "10px 20px", fontSize: "16px", cursor: "pointer", backgroundColor: "#3498db", color: "white", border: "none", borderRadius: "5px" };
const stepBtnStyle = { ...btnStyle, backgroundColor: "#f39c12" };
const mainBtnStyle = { ...btnStyle, backgroundColor: "#27ae60" };
const cardStyle = { border: "1px solid #ddd", padding: "20px", borderRadius: "10px", width: "300px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" };

export default App;