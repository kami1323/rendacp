const token = '7712986341:AAHKILUAUQJ87YbsCGUwBa_TAHuXw4RRzcQ'; // توکن تلگرام شما
const chatId = '1604738285'; // شناسه چت تلگرام شما

// ارسال نوتیفیکیشن به تلگرام
function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message })
  })
  .then(response => response.json())
  .then(data => {
    if (data.ok) console.log('پیام ارسال شد');
    else console.log('ارسال پیام با مشکل مواجه شد');
  })
  .catch(error => console.error('خطا در ارسال پیام:', error));
}

// دریافت لیست ارزهای دیجیتال از بایننس برای autocomplete
async function getCryptoList() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    const data = await response.json();
    const symbols = data.symbols.filter(symbol => symbol.status === 'TRADING');
    const cryptoNames = symbols.map(symbol => symbol.symbol.replace('USDT', '').toUpperCase());

    const dataList = document.getElementById('crypto-list');
    cryptoNames.forEach(crypto => {
      const option = document.createElement('option');
      option.value = crypto;
      dataList.appendChild(option);
    });
  } catch (error) {
    console.error('خطا در دریافت لیست ارزها:', error);
  }
}

// دریافت قیمت و درصد تغییرات روزانه ارز
async function getCryptoData(cryptoName) {
  try {
    const priceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cryptoName.toUpperCase()}USDT`);
    const changeResponse = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${cryptoName.toUpperCase()}USDT`);
    
    const priceData = await priceResponse.json();
    const changeData = await changeResponse.json();
    
    const price = priceData.price;
    const changePercentage = changeData.priceChangePercent;
    
    return { price, changePercentage };
  } catch (error) {
    console.error('خطا در دریافت اطلاعات ارز:', error);
    return { price: null, changePercentage: null };
  }
}

// ذخیره هشدار جدید
document.getElementById('save-alert').addEventListener('click', async function() {
  const cryptoName = document.getElementById('crypto-name').value;
  const targetPrice = parseFloat(document.getElementById('target-price').value);

  if (cryptoName && !isNaN(targetPrice)) {
    const { price, changePercentage } = await getCryptoData(cryptoName);

    if (price && changePercentage !== null) {
      const alertContainer = document.getElementById('alert-container');
      
      // ایجاد هشدار جدید
      const alertRow = document.createElement('div');
      alertRow.classList.add('alert-row');
      alertRow.innerHTML = `
        <div class="crypto-name">${cryptoName}</div>
        <div class="crypto-price">${price} USDT</div>
        <div class="crypto-change">${changePercentage}%</div>
        <div class="target-price">${targetPrice}</div>
      `;

      alertContainer.appendChild(alertRow); // اضافه کردن هشدار جدید به پایین

      // پاک کردن فیلدها برای هشدار جدید
      document.getElementById('crypto-name').value = '';
      document.getElementById('crypto-price').value = '';
      document.getElementById('crypto-change').value = '';
      document.getElementById('target-price').value = '';

      // بررسی قیمت و ارسال نوتیفیکیشن اگر قیمت عبور کرد
      setInterval(() => {
        checkPriceAndNotify(cryptoName, targetPrice, alertRow);
      }, 60000); // هر 60 ثانیه یک‌بار بررسی می‌کند
    }
  }
});

// بررسی قیمت و ارسال نوتیفیکیشن
async function checkPriceAndNotify(cryptoName, targetPrice, alertRow) {
  const { price, changePercentage } = await getCryptoData(cryptoName);
  
  // به‌روزرسانی قیمت و درصد تغییرات برای هشدارهای فعال
  alertRow.querySelector('.crypto-price').textContent = `${price} USDT`;
  alertRow.querySelector('.crypto-change').textContent = `${changePercentage}%`;

  if (price >= targetPrice) {
    // ارسال نوتیفیکیشن به تلگرام زمانی که قیمت هشدار فعال می‌شود
    sendTelegramNotification(`هشدار! قیمت ${cryptoName} به ${price} USDT رسید.`);

    // تغییر رنگ نام ارز به آبی
    alertRow.querySelector('.crypto-name').style.color = 'blue'; // تغییر رنگ به آبی
  }
}

// هنگام ورود نام ارز، قیمت و درصد تغییرات را نمایش بده
document.getElementById('crypto-name').addEventListener('input', async function() {
  const cryptoName = document.getElementById('crypto-name').value;

  if (cryptoName) {
    const { price, changePercentage } = await getCryptoData(cryptoName);

    document.getElementById('crypto-price').value = price ? price : 'داده‌ای یافت نشد';
    document.getElementById('crypto-change').value = changePercentage ? changePercentage : 'داده‌ای یافت نشد';
  }
});

// راه‌اندازی لیست ارزهای دیجیتال هنگام بارگذاری صفحه
getCryptoList();
