import React, { useState } from 'react';
import './Login.css';

function Login({ setRole }) {
  const [selectedRole, setSelectedRole] = useState('');

  const roles = [
    { value: 'ADMIN', label: 'Quản trị viên - ADMIN' },
    { value: 'SELLER', label: 'Người bán cước - SELLER' },
    { value: 'BUYER', label: 'Người mua cước - BUYER' },
  ];

  const handleLogin = () => {
    if (!selectedRole) {
      alert('Vui lòng chọn tác nhân đăng nhập');
      return;
    }
    setRole(selectedRole); // Chuyển trang tự động bằng State
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Đăng nhập Hệ thống Thanh toán Blockchain</h2>
        <div className="form-group">
          <label>Chọn tác nhân đăng nhập</label>
          <select 
            value={selectedRole} 
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">-- Chọn tài khoản --</option>
            {roles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
        <button onClick={handleLogin} className="login-button">
          Đăng nhập (Connect Wallet)
        </button>
      </div>
    </div>
  );
}

export default Login;