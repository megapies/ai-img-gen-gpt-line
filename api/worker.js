// api/worker.js
require('dotenv').config();
const line = require('@line/bot-sdk');
const { Configuration, OpenAIApi } = require('openai');
const Bull = require('bull');

// อ่านค่า Environment Variables
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// สร้าง LINE Client
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// ตั้งค่า OpenAI
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

// สร้าง Bull Queue
const imageQueue = new Bull('image-generation', process.env.REDIS_URL);

// ประมวลผลงานใน Queue
const processQueue = async () => {
  const job = await imageQueue.getNextJob();

  if (job) {
    const { replyToken, prompt } = job.data;

    try {
      // เรียกใช้ OpenAI เพื่อสร้างภาพ
      const response = await openai.createImage({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      const imageUrl = response.data.data[0].url;

      // ส่งภาพกลับไปยังผู้ใช้
      await client.replyMessage(replyToken, {
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      });

      // ทำเครื่องหมายว่างานเสร็จสมบูรณ์
      await job.moveToCompleted('done', true);
    } catch (error) {
      console.error('Error generating image:', error);

      // ส่งข้อความแจ้งข้อผิดพลาดกลับไปยังผู้ใช้
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการสร้างภาพ กรุณาลองใหม่อีกครั้ง',
      });

      // ทำเครื่องหมายว่างานล้มเหลว
      await job.moveToFailed({ message: error.message }, true);
    }
  } else {
    console.log('No jobs in queue');
  }
};

// Export เป็น Serverless Function
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  await processQueue();

  res.status(200).send('Worker executed');
};
