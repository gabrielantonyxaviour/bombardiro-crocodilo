const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying WorldTesting with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  const worldId = "0x57f928158C3EE7CDad1e4D8642503c4D0201f611";
  const appId = process.env.WORLD_APP_ID || "";
  const actionId = "onboarding";

  console.log({
    worldId,
    appId,
    actionId,
  });

  const WorldTesting = await hre.ethers.getContractFactory("WorldTesting");
  const worldTesting = await WorldTesting.deploy(worldId, appId, actionId);

  await worldTesting.waitForDeployment();
  const frankyAddress = await worldTesting.getAddress();

  console.log("WorldTesting deployed to:", frankyAddress);

  // Save deployment information
  const deploymentData = {
    network: network,
    worldTesting: frankyAddress,
    timestamp: new Date().toISOString(),
  };

  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }

  fs.writeFileSync(
    path.join(deploymentDir, `${network}-deployment.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  // Verify WorldTesting contract
  console.log("Waiting for block confirmations...");
  // In ethers v6, we access the deployment transaction differently
  const deployTx = worldTesting.deploymentTransaction();
  await deployTx.wait(2);

  // Verify contract on Etherscan if not on a local network
  if (network !== "localhost" && network !== "hardhat") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: frankyAddress,
        constructorArguments: [worldId, appId, actionId],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
