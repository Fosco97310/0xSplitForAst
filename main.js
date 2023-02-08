import { SplitsClient } from '@0xsplits/splits-sdk';
import { Telegraf } from 'telegraf';
import axios from 'axios';

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const token = '<Ton Token ICI>'

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
    for (const key in response.activeBalances) {
        let tokenSymbol = tokenData[key].tokenSymbol
        let tokenBalance = formatBalance(response.activeBalances[key]._hex, tokenData[key].tokenDecimal)
        let datatest = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${key}&vs_currencies=usd`)
        let tokenPrice = tokenBalance*datatest.data[key.toLowerCase()].usd
        withdrawData.push({tokenSymbol: tokenSymbol, tokenBalance: tokenBalance, tokenPrice: tokenPrice, tokenAddress: tokenData[key].tokenAddress})
    }
    withdrawData.sort((a, b) => b.tokenPrice - a.tokenPrice)
    return withdrawData;
}

let lastMessageTime = 0;

bot.use((ctx, next) => {
    const message = ctx.update.message;
    if (message.chat.type === 'private') {
        return;
    }
    const currentTime = Date.now();
    if (currentTime - lastMessageTime > 60000) {
        lastMessageTime = currentTime;
        return next();
    }
    return ctx.reply('Le bot est limité à une utilisation par minute');
});

bot.command('getwithdraw', async ctx => {
    console.log(ctx.from)
    const message = ctx.update.message;
    if (message.chat.type === 'private') {
        return;
    }
    try {
        let awnser = await getAllWithdraw()
        let text = "Tokens qui attendent d'être withdraw :\n\n"
        awnser.forEach(element => {
            text += element.tokenBalance.toFixed(2)
            text += `<a href="etherscan.io/address/${element.tokenAddress}">`
            text += " "
            text += element.tokenSymbol
            text += "</a> - $"
            text += element.tokenPrice.toFixed(2)
            text += "\n" 
        })
        text += "\nData provided by CoinGecko" 
        bot.telegram.sendMessage(ctx.chat.id, text, {parse_mode: 'HTML', disable_web_page_preview: true})
    } catch (error) {
        bot.telegram.sendMessage(ctx.chat.id, "Erreur: requête api dépassé")
        console.log(error)
    } 
})

bot.launch({ dropPendingUpdates: true })

function formatBalance(balance, decimals) {
    return balance / (10 ** decimals)
}
