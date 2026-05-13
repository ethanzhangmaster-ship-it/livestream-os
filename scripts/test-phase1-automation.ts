/**
 * Phase 1 自动化测试脚本
 * 
 * 测试话术生成和自动回复功能
 */

import { ScriptGenerator, DEFAULT_SESSION_CONTEXT } from '../src/automation/script-generator';
import { AutoReplyEngine, Comment } from '../src/automation/auto-reply-engine';
import { CommentClassifier } from '../src/automation/comment-classifier';

async function testPhase1() {
  console.log('========================================');
  console.log('  Phase 1 自动化测试');
  console.log('========================================\n');

  // 1. 测试话术生成
  console.log('[测试 1] 话术生成引擎\n');
  
  const scriptGenerator = new ScriptGenerator(DEFAULT_SESSION_CONTEXT);

  // 测试不同场景的话术
  const testCases = [
    { scene: '开场欢迎', trigger: 'session_start' },
    { scene: '产品展示', trigger: 'product_inquiry' },
    { scene: '优惠活动', trigger: 'high_attention' },
    { scene: '喂食演示', trigger: 'purchase_hesitation' },
    { scene: '优惠活动', trigger: 'purchase_signal' },
  ];

  for (const testCase of testCases) {
    const script = scriptGenerator.generateScript(testCase.scene, testCase.trigger);
    
    if (script) {
      console.log(`场景: ${testCase.scene}`);
      console.log(`触发: ${testCase.trigger}`);
      console.log(`话术: ${script.script}`);
      console.log(`置信度: ${(script.confidence * 100).toFixed(1)}%`);
      console.log();
    }
  }

  // 2. 测试评论分类
  console.log('[测试 2] 评论分类器\n');
  
  const classifier = new CommentClassifier();

  const testComments = [
    '这个产品多少钱？',
    '鸟宝多大可以吃？',
    '太贵了，买不起',
    '已买，期待效果',
    '怎么样，好不好用？',
    '怎么买？有链接吗？',
    '挑食的鸟能吃吗？',
  ];

  for (const comment of testComments) {
    const result = classifier.classify(comment);
    
    if (result) {
      console.log(`评论: ${comment}`);
      console.log(`类型: ${result.type}`);
      console.log(`置信度: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`关键词: ${result.keywords.join(', ')}`);
      console.log();
    }
  }

  // 3. 测试自动回复
  console.log('[测试 3] 自动回复引擎\n');
  
  const autoReplyEngine = new AutoReplyEngine(DEFAULT_SESSION_CONTEXT);

  const testComments2: Comment[] = [
    {
      msgId: 'comment_001',
      content: '这个产品多少钱？',
      user: {
        openId: 'user_001',
        nickname: '小明',
      },
      timestamp: Date.now(),
    },
    {
      msgId: 'comment_002',
      content: '鸟宝多大可以吃？',
      user: {
        openId: 'user_002',
        nickname: '小红',
      },
      timestamp: Date.now(),
    },
    {
      msgId: 'comment_003',
      content: '太贵了，考虑一下',
      user: {
        openId: 'user_003',
        nickname: '小刚',
      },
      timestamp: Date.now(),
    },
    {
      msgId: 'comment_004',
      content: '已买，期待效果',
      user: {
        openId: 'user_004',
        nickname: '小李',
      },
      timestamp: Date.now(),
    },
    {
      msgId: 'comment_005',
      content: '怎么买？有链接吗？',
      user: {
        openId: 'user_005',
        nickname: '小王',
      },
      timestamp: Date.now(),
    },
  ];

  const replies = autoReplyEngine.batchReply(testComments2);

  for (const reply of replies) {
    console.log(`评论 ID: ${reply.commentId}`);
    console.log(`回复: ${reply.reply}`);
    console.log(`类型: ${reply.type}`);
    console.log(`置信度: ${(reply.confidence * 100).toFixed(1)}%`);
    console.log();
  }

  // 4. 统计信息
  console.log('[测试 4] 统计信息\n');
  
  const stats = autoReplyEngine.getStatistics();
  
  console.log(`总回复数: ${stats.totalReplies}`);
  console.log(`平均置信度: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log('\n按类型统计:');
  
  for (const [type, count] of Object.entries(stats.repliesByType)) {
    console.log(`  ${type}: ${count} 条`);
  }

  console.log('\n========================================');
  console.log('  Phase 1 测试完成');
  console.log('========================================\n');
}

// 运行测试
testPhase1();
