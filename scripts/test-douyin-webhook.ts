/**
 * 抖音 Webhook 测试脚本
 * 
 * 使用方法：
 *   ts-node scripts/test-douyin-webhook.ts
 * 
 * 测试各种抖音直播事件
 */

import * as https from 'https';

const WEBHOOK_URL = 'https://1m0toy7jv54cf-env-4aIEocFbFQ.service.douyincloud.run/live_data_callback';

interface TestCase {
  name: string;
  msgType: string;
  data: any[];
}

const testCases: TestCase[] = [
  {
    name: '评论事件',
    msgType: 'live_comment',
    data: [
      {
        msg_id: 'comment_001',
        content: '这个产品多少钱？',
        user: {
          open_id: 'user_001',
          nickname: '小明',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        timestamp: Date.now()
      }
    ]
  },
  {
    name: '点赞事件',
    msgType: 'live_like',
    data: [
      {
        msg_id: 'like_001',
        user: {
          open_id: 'user_002',
          nickname: '小红',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        count: 5,
        timestamp: Date.now()
      }
    ]
  },
  {
    name: '礼物事件',
    msgType: 'live_gift',
    data: [
      {
        msg_id: 'gift_001',
        user: {
          open_id: 'user_003',
          nickname: '大款',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        gift_id: 'gift_123',
        gift_name: '火箭',
        gift_count: 1,
        diamond_count: 500,
        timestamp: Date.now()
      }
    ]
  },
  {
    name: '进入直播间',
    msgType: 'live_room_enter',
    data: [
      {
        msg_id: 'enter_001',
        user: {
          open_id: 'user_004',
          nickname: '新观众',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        timestamp: Date.now()
      }
    ]
  }
];

function sendRequest(testCase: TestCase): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const postData = JSON.stringify(testCase.data);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-msg-type': testCase.msgType,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\n测试: ${testCase.name}`);
    console.log(`事件类型: ${testCase.msgType}`);
    console.log(`数据: ${JSON.stringify(testCase.data, null, 2)}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`响应状态: ${res.statusCode}`);
        console.log(`响应数据: ${data}`);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`请求失败: ${error.message}`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('========================================');
  console.log('  抖音 Webhook 测试');
  console.log('========================================');
  console.log(`\n目标地址: ${WEBHOOK_URL}\n`);

  for (const testCase of testCases) {
    try {
      await sendRequest(testCase);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 间隔 1 秒
    } catch (error) {
      console.error(`测试失败: ${testCase.name}`, error);
    }
  }

  console.log('\n========================================');
  console.log('  测试完成');
  console.log('========================================');
  console.log('\n请查看抖音云服务日志确认数据已接收：');
  console.log('https://console.douyincloud.cn/');
}

// 运行测试
runTests();
