const hre = require("hardhat");

async function main() {
  console.log("Đang bắt đầu deploy...");

  // 1. Deploy MockToken (USDT giả)
  const Token = await hre.ethers.getContractFactory("MockToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ MockToken (USDT) đã deploy tại:", tokenAddress);

  // 2. Deploy Subscription System và truyền tokenAddress vào Constructor
  const Subscription = await hre.ethers.getContractFactory("Subscription");
  const sub = await Subscription.deploy(tokenAddress);
  await sub.waitForDeployment();
  const subAddress = await sub.getAddress();
  console.log("✅ Subscription System đã deploy tại:", subAddress);

  console.log("-----------------------------------------------");
  console.log("LƯU Ý: Hãy copy 2 địa chỉ trên vào file Notepad để làm Frontend!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});