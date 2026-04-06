const hre = require("hardhat");

async function main() {
  console.log("🚀 Đang bắt đầu deploy...");

  // LẤY DANH SÁCH TÀI KHOẢN 
  const [admin, merchant, subscriber] = await hre.ethers.getSigners();

  // 1. Deploy MockToken
  const Token = await hre.ethers.getContractFactory("MockToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ MockToken đã deploy tại:", tokenAddress);

  // 2. Deploy Subscription
  const Subscription = await hre.ethers.getContractFactory("Subscription");
  const sub = await Subscription.deploy(tokenAddress);
  await sub.waitForDeployment();
  const subAddress = await sub.getAddress();
  console.log("✅ Subscription System đã deploy tại:", subAddress);

  // 3. TẶNG TIỀN CHO NGƯỜI MUA (Dòng 22 của bạn)
  const amount = hre.ethers.parseEther("1000"); 
  await token.transfer(subscriber.address, amount);
  console.log(`💰 Đã tặng 1000 USDT cho Người mua: ${subscriber.address}`);

  console.log("--------------------------------------------------");
  console.log("LƯU Ý: Copy 2 địa chỉ trên vào file config.js!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});