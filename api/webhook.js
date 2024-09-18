// server.js
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const Bull = require('bull');
const Redis = require('ioredis');
const crypto = require('crypto');
const OpenAI = require('openai')

const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

// อ่านค่า Environment Variables
const PORT = process.env.PORT || 3000;
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// สร้าง Express App
const app = express();

// // ตั้งค่า Middleware สำหรับ LINE SDK

// // ตั้งค่า Bull Queue
const redis = new Redis(process.env.REDIS_URL);
const imageQueue = new Bull('image-generation', {
  redis: process.env.REDIS_URL
});

app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events
    const userId = req.body.destination
    console.log(JSON.stringify(events))


    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;

        console.log('user message', userMessage)
        // เพิ่มงานลงใน Queue
        // imageQueue.add({
        //   userId: userId,
        //   replyToken: event.replyToken,
        //   prompt: userMessage,
        // })

        // processImage({ userId, prompt: userMessage })

        // ตอบกลับผู้ใช้ทันทีว่า "กำลังวาดภาพ..."
        return client.replyMessage({
          replyToken: event.replyToken,
          messages: [{
            type: 'text',
            text: `กำลังวาดภาพ UID: ${userId} ${userMessage}`
          }],
        });
      }
    }
    return res.send('OK')
  } catch (error) {
    console.error(error)

    return res.status(500).json({ msg: 'server error' })
  }
})
// // สร้าง Webhook Endpoint
// app.post('/webhook', async (req, res) => {
//   // Line SDK middleware จะตรวจสอบ signature แล้วแปลง body เป็น req.body
//   const events = req.body.events;

//   for (const event of events) {
//     if (event.type === 'message' && event.message.type === 'text') {
//       const userMessage = event.message.text;

//       // เพิ่มงานลงใน Queue
//       await imageQueue.add({
//         replyToken: event.replyToken,
//         prompt: userMessage,
//       });

//       // ตอบกลับผู้ใช้ทันทีว่า "กำลังวาดภาพ..."
//       await client.replyMessage(event.replyToken, {
//         type: 'text',
//         text: 'กำลังวาดภาพ...',
//       });
//     }
//   }

//   res.status(200).send('OK');
// });

app.get('/', async (req, res) => {
  // await imageQueue.add({
  //   replyToken: 'xxx',
  //   prompt: 'xxx',
  // })
  return res.json({ status: 'ok' })
})

// เริ่ม Express Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
