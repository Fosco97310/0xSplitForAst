import { SplitsClient } from '@0xsplits/splits-sdk';
import { Telegraf } from 'telegraf';
import axios from 'axios';

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const token = '<Token Here>'
const apiKey = 'freekey' // api ethplorer

const bot = new Telegraf(token);

const address = "0xe2E7AE67E7ee6d4D90dfef945aB6dE6A14dB4c17";
const args = {
    userId: address,
}

const splitsClient = new SplitsClient({
    chainId: 1
});

const resultTokenData = await axios.get("https://raw.githubusercontent.com/viaprotocol/tokenlists/main/tokenlists/ethereum.json");
let tokenData = {}
resultTokenData.data.forEach(element => {
    tokenData[element.address] = {tokenDecimal:element.decimals, tokenSymbol:element.symbol, tokenAddress:element.address}
});

async function getAllWithdraw() {
    const response = await splitsClient.getUserEarnings(args)
    let withdrawData = []
    for (const addr in response.activeBalances) {
        let tokenSymbol = tokenData[addr].tokenSymbol
        let tokenBalance = formatBalance(response.activeBalances[addr]._hex, tokenData[addr].tokenDecimal)
	let datatest = await axios.get(`https://api.ethplorer.io/getTokenInfo/${addr}?apiKey=${apiKey}`)
        let tokenPrice = tokenBalance*datatest.data.price.rate
        withdrawData.push({tokenSymbol: tokenSymbol, tokenBalance: tokenBalance, tokenPrice: tokenPrice, tokenAddress: tokenData[addr].tokenAddress})
    }
    withdrawData.sort((a, b) => b.tokenPrice - a.tokenPrice)
    return withdrawData;
}

let lastMessageTime = 0;

bot.command('getwithdraw', async ctx => {
    console.log(ctx.from)
    const message = ctx.update.message;
    if (message.chat.type === 'private') {
        return;
    }
    const currentTime = Date.now();
    if (currentTime - lastMessageTime > 60000) {
        lastMessageTime = currentTime;
        try {
            let awnser = await getAllWithdraw()
            let text = "Tokens qui attendent d'être withdraw :\n\n"
            awnser.forEach(element => {
                text += element.tokenBalance.toFixed(2)
                text += `<a href="etherscan.io/token/${element.tokenAddress}">`
                text += " "
                text += element.tokenSymbol
                text += "</a> - $"
                text += element.tokenPrice.toFixed(2)
                text += "\n"
            })
            text += '\n<a href="https://app.0xsplits.xyz/accounts/0xe2E7AE67E7ee6d4D90dfef945aB6dE6A14dB4c17/">Lien pour split/dispatch</a>'
            bot.telegram.sendMessage(ctx.chat.id, text, {parse_mode: 'HTML', disable_web_page_preview: true})
        } catch (error) {
            bot.telegram.sendMessage(ctx.chat.id, "Erreur: requête api dépassé", {})
            console.log(error)
        }   
    }else {
        bot.telegram.sendMessage(ctx.chat.id, "Le bot est limité à une utilisation par minute", {})
    }
})

bot.launch({ dropPendingUpdates: true })

function formatBalance(balance, decimals) {
    return balance / (10 ** decimals)
}
