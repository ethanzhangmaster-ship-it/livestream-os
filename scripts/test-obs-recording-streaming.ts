/**
 * OBS 录像和推流功能测试
 */

import { OBSAdapter } from '../src/render-adapter/obs-adapter';

async function testRecordingAndStreaming() {
  console.log('=== Testing OBS Recording & Streaming ===\n');

  const obsAdapter = new OBSAdapter({
    host: 'localhost',
    port: 4455,
    password: '', // 替换为你的 OBS WebSocket 密码
  });

  // 测试 1: 连接 OBS
  console.log('Test 1: Connect to OBS');
  const connectionStatus = await obsAdapter.connect();
  if (!connectionStatus.connected) {
    console.error('✗ Failed to connect to OBS:', connectionStatus.error);
    console.log('\n请确保 OBS 正在运行，并且 WebSocket 服务器已启动');
    return;
  }
  console.log('✓ Connected to OBS\n');

  // 测试 2: 获取初始状态
  console.log('Test 2: Get initial status');
  const initialRecordingStatus = await obsAdapter.getRecordingStatus();
  const initialStreamingStatus = await obsAdapter.getStreamingStatus();
  console.log('Recording status:', initialRecordingStatus.isRecording ? 'Recording' : 'Not recording');
  console.log('Streaming status:', initialStreamingStatus.isStreaming ? 'Streaming' : 'Not streaming');
  console.log('✓ Initial status retrieved\n');

  // 测试 3: 开始录制
  console.log('Test 3: Start recording');
  const startRecResult = await obsAdapter.startRecording();
  console.log('Result:', startRecResult.message);
  if (startRecResult.success) {
    console.log('✓ Recording started\n');
    
    // 等待 3 秒
    console.log('Recording for 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 测试 4: 获取录制状态
    console.log('\nTest 4: Get recording status while recording');
    const recordingStatus = await obsAdapter.getRecordingStatus();
    console.log('Is recording:', recordingStatus.isRecording);
    console.log('Duration:', recordingStatus.duration, 'seconds');
    console.log('✓ Recording status retrieved\n');

    // 测试 5: 停止录制
    console.log('Test 5: Stop recording');
    const stopRecResult = await obsAdapter.stopRecording();
    console.log('Result:', stopRecResult.message);
    if (stopRecResult.success && stopRecResult.filePath) {
      console.log('File saved to:', stopRecResult.filePath);
    }
    console.log('✓ Recording stopped\n');
  } else {
    console.log('✗ Failed to start recording (might already be recording)\n');
  }

  // 测试 6: 切换录制状态
  console.log('Test 6: Toggle recording');
  const toggleRecResult = await obsAdapter.toggleRecording();
  console.log('Result:', toggleRecResult.message);
  if (toggleRecResult.success) {
    console.log('✓ Recording toggled\n');
    
    // 等待 2 秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 再次切换
    const toggleBackResult = await obsAdapter.toggleRecording();
    console.log('Toggle back result:', toggleBackResult.message);
    console.log('✓ Recording toggled back\n');
  }

  // 测试 7: 推流功能（不实际推流，只测试 API）
  console.log('Test 7: Test streaming API (without actual streaming)');
  const streamingStatus = await obsAdapter.getStreamingStatus();
  console.log('Current streaming status:', streamingStatus.isStreaming ? 'Streaming' : 'Not streaming');
  
  if (!streamingStatus.isStreaming) {
    console.log('Note: To test streaming, you need to configure streaming settings in OBS');
    console.log('✓ Streaming API accessible\n');
  } else {
    console.log('✓ Currently streaming\n');
  }

  // 测试 8: 通过 Action 执行录制
  console.log('Test 8: Execute recording via Action');
  const startAction = await obsAdapter.execute({ type: 'start_recording' });
  console.log('Start recording action result:', startAction.message);
  
  if (startAction.success) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stopAction = await obsAdapter.execute({ type: 'stop_recording' });
    console.log('Stop recording action result:', stopAction.message);
    console.log('✓ Recording via Action completed\n');
  }

  // 断开连接
  console.log('Disconnecting from OBS...');
  await obsAdapter.disconnect();
  console.log('✓ Disconnected\n');

  console.log('========================================');
  console.log('All recording & streaming tests completed ✓');
  console.log('========================================\n');
}

// 运行测试
testRecordingAndStreaming().catch(console.error);
