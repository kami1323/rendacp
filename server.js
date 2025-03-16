require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// ذخیره هشدارهای کاربران
let alerts = []; 
let prevPrices = {}; // ذخیره قیمت قبلی برای هر ارز

// تابع دریافت قیمت از بایننس
async function getCryptoData(symbol) {
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
        return {
            price: parseFloat(response.data.lastPrice),
            changePercentage: parseFloat(response.data.priceChangePercent)
        };
    } catch (error) {
        console.error(`خطا در دریافت قیمت ${symbol}:`, error);
        return null;
    }
}

// ارسال پیام به تلگرام
async function sendTelegramNotification(message) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message
        });
    } catch (error) {
        console.error("خطا در ارسال پیام به تلگرام:", error.response ? error.response.data : error);
    }
}

// بررسی کراس قیمت و ارسال هشدار
async function checkAlerts() {
    for (let alert of alerts) {
        const { cryptoName, targetPrice } = alert;
        const data = await getCryptoData(cryptoName);
        if (!data) continue;

        const { price } = data;
        const prevPrice = prevPrices[cryptoName] || price; // مقدار پیش‌فرض

        if ((prevPrice < targetPrice && price >= targetPrice) || (prevPrice > targetPrice && price <= targetPrice)) {
            await sendTelegramNotification(`🔵 هشدار! قیمت ${cryptoName} به ${price} USDT رسید.`);
            alert.triggered = true;
        }

        prevPrices[cryptoName] = price; // ذخیره قیمت جدید
    }
}

// اجرای چک کردن هشدارها هر دقیقه
cron.schedule('* * * * *', () => {
    console.log("🔄 در حال بررسی هشدارها...");
    checkAlerts();
});

// API برای اضافه کردن هشدار جدید
app.use(express.json());

app.post('/add-alert', (req, res) => {
    const { cryptoName, targetPrice } = req.body;
    if (!cryptoName || !targetPrice) {
        return res.status(400).json({ error: "نام ارز و قیمت هشدار ضروری است." });
    }
    alerts.push({ cryptoName: cryptoName.toUpperCase(), targetPrice: parseFloat(targetPrice), triggered: false });
    res.json({ message: "هشدار ذخیره شد!" });
});

// API برای دریافت هشدارهای فعال
app.get('/alerts', (req, res) => {
    res.json(alerts);
});

// اجرای سرور
app.listen(PORT, () => {
    console.log(`🚀 سرور روی پورت ${PORT} اجرا شد!`);
});
