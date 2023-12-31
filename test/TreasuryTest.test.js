const { assert, expect } = require("chai")
const { ethers } = require("hardhat")
const { networks } = require("../hardhat.config")

const deployerAddress = "0xe371cDd686341baDbE337D21c53fA51Db505e361" // My account with funds for impersonating 

let deployedTreasuryAddress = "0x997d3168776d9AF7A60d3664E1e69704e72F38b0" // Deployed Treasury address in mainnet (Arbitrum) // USE IN LINE 22 FOR TESTING CONTRACT

const SushiSwapRouterV2Address = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506" // SushiSwapV2Router in Arbitrum
const CamelotV2RouterAddress = "0xc873fEcbd354f5A56E00E710B90EF4201db2448d" // CamelotV2Router in Arbitrum

const WETHAddress = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" // WETH address in Arbitrum
const USDTAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" // USDT address in Arbitrum
const DAIAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1" // DAI address in Arbitrum
let deployer, snapshotId

describe("Treasury tests", async function () {
    this.beforeEach(async () => {
        console.log("BeforeEach")
        snapshotId = await network.provider.send("evm_snapshot");

        //Treasury = await ethers.getContractAt("Treasury", deployedTreasuryAddress) // ---- UNCOMMENT THIS LINE IF YOU WANT TO TEST AN ALREADY DEPLOYED CONTRACT AT DESIGNED ADDRESS

        const TreasuryFactory = await ethers.getContractFactory("Treasury");
        Treasury = await TreasuryFactory.deploy(WETHAddress, USDTAddress, SushiSwapRouterV2Address, CamelotV2RouterAddress);
        
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [deployerAddress],
        });
        deployer = await ethers.getSigner(deployerAddress)
     
        await hre.network.provider.send("hardhat_setBalance", [deployerAddress, "0x56BC75E2D63100000"]); // We are sending 100 ETH "fake" in forked network
    });

    this.afterEach(async () => {
        console.log("AfterEach");

        // Revert to the previous EVM snapshot after each test
        await network.provider.send("evm_revert", [snapshotId]);
    });

    describe("constructor", () => {
        it("Sets starting values correctly", async function () {
            const SushiRouterV2Address_ = await Treasury.sushiswapV2Router()
            const CamelotRouterV2Address_ = await Treasury.camelotV2Router()
            const WETHAddress_ = await Treasury.WETH()
            const USDTAddress_ = await Treasury.USDT()
            assert.equal(SushiRouterV2Address_, SushiSwapRouterV2Address)
            assert.equal(CamelotRouterV2Address_, CamelotV2RouterAddress)
            assert.equal(WETHAddress_, WETHAddress)
            assert.equal(USDTAddress_, USDTAddress)
        });
    });

    describe("Deposit function", () => {
        it("Deposits any token correctly into the Treasury", async function () {
            const WETH = await ethers.getContractAt("IWETH", WETHAddress)
            const WETHBalanceBefore = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceBefore = await Treasury.WETHAmount()
            await WETH.connect(deployer).approve(await Treasury.getAddress(), WETHBalanceBefore)

            const deposit = await Treasury.connect(deployer).depositWETH(WETHBalanceBefore.toString())
            const WETHBalanceAfter = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceAfter = await Treasury.WETHAmount()

            assert(WETHBalanceBefore > WETHBalanceAfter)
            assert(TreasuryWETHBalanceBefore < TreasuryWETHBalanceAfter)
        });
    })

    describe("Swap WETH balance to WETH correctly using Sushiswap and Camelot", () => {
        it("Swaps internal tokens correctly that were previously deposited using SushiSwap", async function () {
            // First step: deposit WETH tokens
            const WETH = await ethers.getContractAt("IWETH", WETHAddress)
            const USDT = await ethers.getContractAt("IERC20", USDTAddress)
            const WETHBalanceBefore = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceBefore = await Treasury.WETHAmount()
            await WETH.connect(deployer).approve(await Treasury.getAddress(), WETHBalanceBefore)

            const deposit = await Treasury.connect(deployer).depositWETH(WETHBalanceBefore.toString())
            const WETHBalanceAfter = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceAfter = await Treasury.WETHAmount()
            const USDTInternalBalanceBeforeSwap = await USDT.balanceOf(await Treasury.getAddress())
            assert(USDTInternalBalanceBeforeSwap == 0)
            assert(WETHBalanceBefore > WETHBalanceAfter)
            assert(TreasuryWETHBalanceBefore < TreasuryWETHBalanceAfter)


            // Second step: swap internally using SushiSwap
            const WETHInternalBalanceBeforeSwap = await Treasury.WETHAmount()
            const timestamp = Date.now()
            const swap = await Treasury.connect(deployer).swapWETHforUSDT([WETHAddress, USDTAddress], WETHInternalBalanceBeforeSwap.toString(), 0, 0, timestamp)

            const WETHInternalBalanceAfterSwap = await Treasury.WETHAmount()
            const USDTInternalBalanceAfterSwap = await USDT.balanceOf(await Treasury.getAddress())
            
            assert(WETHInternalBalanceAfterSwap.toString() == 0)
            assert(USDTInternalBalanceAfterSwap > 0)
        });

        it("Swaps internal tokens correctly that were previously deposited using Camelot", async function () {
            // First step: deposit WETH tokens
            const WETH = await ethers.getContractAt("IWETH", WETHAddress)
            const USDT = await ethers.getContractAt("IERC20", USDTAddress)
            const WETHBalanceBefore = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceBefore = await Treasury.WETHAmount()
            await WETH.connect(deployer).approve(await Treasury.getAddress(), WETHBalanceBefore)

            const deposit = await Treasury.connect(deployer).depositWETH(WETHBalanceBefore.toString())
            const WETHBalanceAfter = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceAfter = await Treasury.WETHAmount()
            const USDTInternalBalanceBeforeSwap = await USDT.balanceOf(await Treasury.getAddress())
            assert(USDTInternalBalanceBeforeSwap == 0)
            assert(WETHBalanceBefore > WETHBalanceAfter)
            assert(TreasuryWETHBalanceBefore < TreasuryWETHBalanceAfter)


            // Second step: swap internally using Camelot
            const WETHInternalBalanceBeforeSwap = await Treasury.WETHAmount()
            const timestamp = Date.now()
            const swap = await Treasury.connect(deployer).swapWETHforUSDT([WETHAddress, USDTAddress], WETHInternalBalanceBeforeSwap.toString(), 1, 0, timestamp)

            const WETHInternalBalanceAfterSwap = await Treasury.WETHAmount()
            const USDTInternalBalanceAfterSwap = await USDT.balanceOf(await Treasury.getAddress())
            
            assert(WETHInternalBalanceAfterSwap.toString() == 0)
            assert(USDTInternalBalanceAfterSwap > 0)
        });
    })

    describe("Withdraw USDT from treasury", () => {
        it("Deposit, swaps and then allows swapped USDT correctly from treasury", async function () {
            // First step: deposit WETH tokens
            const WETH = await ethers.getContractAt("IWETH", WETHAddress)
            const USDT = await ethers.getContractAt("IERC20", USDTAddress)
            const WETHBalanceBefore = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceBefore = await Treasury.WETHAmount()
            await WETH.connect(deployer).approve(await Treasury.getAddress(), WETHBalanceBefore)

            const deposit = await Treasury.connect(deployer).depositWETH(WETHBalanceBefore.toString())
            const WETHBalanceAfter = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceAfter = await Treasury.WETHAmount()
            const USDTInternalBalanceBeforeSwap = await USDT.balanceOf(await Treasury.getAddress())
            assert(USDTInternalBalanceBeforeSwap == 0)
            assert(WETHBalanceBefore > WETHBalanceAfter)
            assert(TreasuryWETHBalanceBefore < TreasuryWETHBalanceAfter)


            // Second step: swap internally using SushiSwap
            const WETHInternalBalanceBeforeSwap = await Treasury.WETHAmount()
            const timestamp = Date.now()
            const swap = await Treasury.connect(deployer).swapWETHforUSDT([WETHAddress, USDTAddress], WETHInternalBalanceBeforeSwap.toString(), 0, 0, timestamp)

            const WETHInternalBalanceAfterSwap = await Treasury.WETHAmount()
            const USDTInternalBalanceAfterSwap = await USDT.balanceOf(await Treasury.getAddress())
        
            assert(WETHInternalBalanceAfterSwap.toString() == 0)
            assert(USDTInternalBalanceAfterSwap > 0)

            // Third step: withdraw the swapped USDT
            const USDTBalanceUserWalletBeforeWithdraw = await USDT.balanceOf(deployerAddress)
            const withdraw = await Treasury.connect(deployer).withdrawAllUSDT()
            const USDTInternalBalanceAfterWithdrawing = await USDT.balanceOf(await Treasury.getAddress())
            assert(USDTInternalBalanceAfterWithdrawing < USDTInternalBalanceAfterSwap)
            assert(USDTInternalBalanceAfterWithdrawing == 0)

            const USDTBalanceUserWalletAfterWithdraw = await USDT.balanceOf(deployerAddress)
            assert(USDTBalanceUserWalletAfterWithdraw > USDTBalanceUserWalletBeforeWithdraw)
        });
    });

    describe("Test reverting swapping incorrent path", () => {
        it("Should revert due to swapping to DAI", async function () {
            // First step: deposit WETH tokens
            const WETH = await ethers.getContractAt("IWETH", WETHAddress)
            const USDT = await ethers.getContractAt("IERC20", USDTAddress)
            const WETHBalanceBefore = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceBefore = await Treasury.WETHAmount()
            await WETH.connect(deployer).approve(await Treasury.getAddress(), WETHBalanceBefore)

            const deposit = await Treasury.connect(deployer).depositWETH(WETHBalanceBefore.toString())
            const WETHBalanceAfter = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceAfter = await Treasury.WETHAmount()
            const USDTInternalBalanceBeforeSwap = await USDT.balanceOf(await Treasury.getAddress())
            assert(USDTInternalBalanceBeforeSwap == 0)
            assert(WETHBalanceBefore > WETHBalanceAfter)
            assert(TreasuryWETHBalanceBefore < TreasuryWETHBalanceAfter)

            // Second step: swap internally using SushiSwap
            const WETHInternalBalanceBeforeSwap = await Treasury.WETHAmount()
            const timestamp = Date.now()
            try {
                await Treasury.connect(deployer).swapWETHforUSDT([WETHAddress, DAIAddress], WETHInternalBalanceBeforeSwap.toString(), 0, 0, timestamp);
                assert.fail("Transaction did not revert as expected.");
            } catch (error) {
                assert.include(error.message, "You are only allowed to swap to USDT");
            }
        });

        it("Should revert due to swapping from USDT", async function () {
            // First step: deposit WETH tokens
            const WETH = await ethers.getContractAt("IWETH", WETHAddress)
            const USDT = await ethers.getContractAt("IERC20", USDTAddress)
            const WETHBalanceBefore = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceBefore = await Treasury.WETHAmount()
            await WETH.connect(deployer).approve(await Treasury.getAddress(), WETHBalanceBefore)

            const deposit = await Treasury.connect(deployer).depositWETH(WETHBalanceBefore.toString())
            const WETHBalanceAfter = await WETH.balanceOf(deployerAddress)
            const TreasuryWETHBalanceAfter = await Treasury.WETHAmount()
            const USDTInternalBalanceBeforeSwap = await USDT.balanceOf(await Treasury.getAddress())
            assert(USDTInternalBalanceBeforeSwap == 0)
            assert(WETHBalanceBefore > WETHBalanceAfter)
            assert(TreasuryWETHBalanceBefore < TreasuryWETHBalanceAfter)

            // Second step: swap internally using SushiSwap
            const WETHInternalBalanceBeforeSwap = await Treasury.WETHAmount()
            const timestamp = Date.now()
            try {
                await Treasury.connect(deployer).swapWETHforUSDT([USDT, WETHAddress], WETHInternalBalanceBeforeSwap.toString(), 0, 0, timestamp);
                assert.fail("Transaction did not revert as expected.");
            } catch (error) {
                assert.include(error.message, "You are only allowed to swap from WETH");
            }
        });
    });
})