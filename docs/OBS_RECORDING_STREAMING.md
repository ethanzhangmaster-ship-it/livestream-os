# OBS 录像和推流功能

## 概述

Livestream OS 现已支持完整的 OBS 录像和推流控制功能，可通过 API 或 Action 自动化控制直播流程。

---

## 功能列表

### 1. 录制控制

- **开始录制**: `startRecording()`
- **停止录制**: `stopRecording()`
- **获取录制状态**: `getRecordingStatus()`
- **切换录制状态**: `toggleRecording()`

### 2. 推流控制

- **开始推流**: `startStreaming()`
- **停止推流**: `stopStreaming()`
- **获取推流状态**: `getStreamingStatus()`
- **切换推流状态**: `toggleStreaming()`

---

## API 使用

### 方式一：直接调用方法

```typescript
import { OBSAdapter } from './src/render-adapter/obs-adapter';

const obsAdapter = new OBSAdapter({
  host: 'localhost',
  port: 4455,
  password: 'your_password',
});

await obsAdapter.connect();

// 开始录制
const startResult = await obsAdapter.startRecording();
console.log(startResult.message);

// 获取录制状态
const status = await obsAdapter.getRecordingStatus();
console.log('Is recording:', status.isRecording);
console.log('Duration:', status.duration, 'seconds');

// 停止录制
const stopResult = await obsAdapter.stopRecording();
console.log('File saved to:', stopResult.filePath);
```

### 方式二：通过 Action 执行

```typescript
// 开始录制
await obsAdapter.execute({ type: 'start_recording' });

// 停止录制
await obsAdapter.execute({ type: 'stop_recording' });

// 开始推流
await obsAdapter.execute({ type: 'start_streaming' });

// 停止推流
await obsAdapter.execute({ type: 'stop_streaming' });
```

---

## 集成到 Runtime

### 在 Runtime Engine 中使用

```typescript
// src/runtime/index.ts

export class RuntimeEngine {
  async decide(attentionState: AttentionState, intent: Intent): Promise<Action[]> {
    // 根据注意力状态自动开始/停止录制
    
    if (attentionState.density > 0.8 && !this.isRecording) {
      // 高注意力时自动开始录制
      return [{ type: 'start_recording' }];
    }
    
    if (attentionState.density < 0.2 && this.isRecording) {
      // 低注意力时自动停止录制
      return [{ type: 'stop_recording' }];
    }
    
    // ... 其他决策逻辑
  }
}
```

---

## 使用场景

### 1. 自动录制高光时刻

```typescript
// 当检测到高互动时自动录制
if (attentionState.pattern === 'engagement_high') {
  await obsAdapter.startRecording();
  
  // 录制 30 秒
  setTimeout(async () => {
    await obsAdapter.stopRecording();
  }, 30000);
}
```

### 2. 定时录制

```typescript
// 每 10 分钟录制一段
setInterval(async () => {
  await obsAdapter.startRecording();
  
  setTimeout(async () => {
    const result = await obsAdapter.stopRecording();
    console.log('Saved:', result.filePath);
  }, 60000); // 录制 1 分钟
}, 600000); // 每 10 分钟
```

### 3. 基于事件的录制

```typescript
// 当用户提问时录制
douyinAdapter.on('comment', async (event) => {
  const intent = intentParser.parse(event.content);
  
  if (intent.type === 'product_inquiry') {
    // 产品咨询时开始录制
    await obsAdapter.startRecording();
    
    // 录制回答过程
    setTimeout(async () => {
      await obsAdapter.stopRecording();
    }, 30000);
  }
});
```

### 4. 自动开播

```typescript
// 定时开播
const scheduleLive = async () => {
  // 开始推流
  await obsAdapter.startStreaming();
  
  // 开始录制
  await obsAdapter.startRecording();
  
  console.log('直播已开始');
};

// 定时下播
const endLive = async () => {
  // 停止录制
  await obsAdapter.stopRecording();
  
  // 停止推流
  await obsAdapter.stopStreaming();
  
  console.log('直播已结束');
};
```

---

## 完整示例

### 场景：智能录制系统

```typescript
import { OBSAdapter } from './src/render-adapter/obs-adapter';
import { AttentionBus } from './src/attention-bus';
import { IntentParser } from './src/intent-parser';

class SmartRecordingSystem {
  private obsAdapter: OBSAdapter;
  private attentionBus: AttentionBus;
  private intentParser: IntentParser;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  constructor() {
    this.obsAdapter = new OBSAdapter();
    this.attentionBus = new AttentionBus();
    this.intentParser = new IntentParser();
  }

  async initialize() {
    await this.obsAdapter.connect();
    
    // 监听注意力状态变化
    this.attentionBus.on('attention_update', (state) => {
      this.handleAttentionChange(state);
    });

    // 监听弹幕事件
    this.attentionBus.on('comment', (event) => {
      this.handleComment(event);
    });
  }

  private async handleAttentionChange(state: AttentionState) {
    // 高注意力时开始录制
    if (state.density > 0.8 && !this.isRecording) {
      console.log('High attention detected, starting recording...');
      await this.startSmartRecording();
    }

    // 低注意力持续 30 秒后停止录制
    if (state.density < 0.3 && this.isRecording) {
      const duration = Date.now() - this.recordingStartTime;
      if (duration > 30000) {
        console.log('Low attention, stopping recording...');
        await this.stopSmartRecording();
      }
    }
  }

  private async handleComment(event: CommentEvent) {
    const intent = this.intentParser.parse(event.content);

    // 产品咨询时确保录制
    if (intent.type === 'product_inquiry' && !this.isRecording) {
      console.log('Product inquiry detected, starting recording...');
      await this.startSmartRecording();
    }
  }

  private async startSmartRecording() {
    const result = await this.obsAdapter.startRecording();
    if (result.success) {
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      console.log('Recording started');
    }
  }

  private async stopSmartRecording() {
    const result = await this.obsAdapter.stopRecording();
    if (result.success) {
      this.isRecording = false;
      console.log('Recording stopped, file:', result.filePath);
      
      // 可以在这里添加自动剪辑逻辑
      // await this.autoEdit(result.filePath);
    }
  }
}

// 使用
const system = new SmartRecordingSystem();
await system.initialize();
```

---

## 测试

运行测试脚本：

```bash
npm run test-obs-recording
```

测试内容：
1. 连接 OBS
2. 获取初始状态
3. 开始录制
4. 获取录制状态
5. 停止录制
6. 切换录制状态
7. 测试推流 API
8. 通过 Action 执行录制

---

## 注意事项

### 1. OBS 配置

确保 OBS 已正确配置：
- **录制设置**: 设置 → 输出 → 录像
- **推流设置**: 设置 → 流
- **WebSocket**: 工具 → WebSocket 服务器设置

### 2. 录制路径

录制文件会保存到 OBS 设置的默认路径，可通过 `stopRecording()` 返回的 `filePath` 获取。

### 3. 推流配置

推流前需要在 OBS 中配置：
- 服务器地址（如 rtmp://xxx）
- 推流密钥

### 4. 错误处理

所有方法都会返回 `{ success: boolean, message?: string }`，建议检查返回值：

```typescript
const result = await obsAdapter.startRecording();
if (!result.success) {
  console.error('Failed to start recording:', result.message);
}
```

---

## API 参考

### startRecording()

开始录制。

**返回值**:
```typescript
{
  success: boolean;
  message?: string;
}
```

### stopRecording()

停止录制。

**返回值**:
```typescript
{
  success: boolean;
  message?: string;
  filePath?: string; // 录制文件路径
}
```

### getRecordingStatus()

获取录制状态。

**返回值**:
```typescript
{
  isRecording: boolean;
  duration?: number; // 录制时长（秒）
  filePath?: string;
}
```

### startStreaming()

开始推流。

**返回值**:
```typescript
{
  success: boolean;
  message?: string;
}
```

### stopStreaming()

停止推流。

**返回值**:
```typescript
{
  success: boolean;
  message?: string;
}
```

### getStreamingStatus()

获取推流状态。

**返回值**:
```typescript
{
  isStreaming: boolean;
  duration?: number; // 推流时长（秒）
  bytesPerSec?: number; // 每秒传输字节数
}
```

### toggleRecording()

切换录制状态（开→关，关→开）。

**返回值**:
```typescript
{
  success: boolean;
  message?: string;
}
```

### toggleStreaming()

切换推流状态（开→关，关→开）。

**返回值**:
```typescript
{
  success: boolean;
  message?: string;
}
```

---

## 下一步

- [ ] 自动剪辑功能（集成 CapCut API）
- [ ] 录制文件自动上传
- [ ] 多平台同时推流
- [ ] 录制文件自动打标签
