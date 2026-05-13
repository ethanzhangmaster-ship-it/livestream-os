/**
 * 配置管理系统
 * 统一管理所有模块配置
 */

// ============================================
// OBS Configuration
// ============================================

export interface OBSConfig {
  host: string;
  port: number;
  password: string;
  autoReconnect: boolean;
  reconnectInterval: number;
}

// ============================================
// Douyin Configuration
// ============================================

export interface DouyinConfig {
  apiKey?: string;
  apiSecret?: string;
  roomId?: string;
  useFakeData: boolean; // 是否使用模拟数据
}

// ============================================
// Runtime Configuration
// ============================================

export interface RuntimeThresholds {
  hookDurationMax: number; // 秒
  avgAttentionMin: number; // 0-1
  dropRiskMax: number; // 0-1
  mutationStepSizeMax: number; // 0-1
  convergenceScoreMin: number; // 0-1
}

export interface RuntimeWindows {
  attentionAggregationMs: number; // 毫秒
  intentContextSize: number; // 评论数
  momentumCalculationMs: number; // 毫秒
}

export interface RuntimeSafety {
  maxMutationCycles: number;
  stabilityTestCycles: number;
}

export interface RuntimeConfig {
  thresholds: RuntimeThresholds;
  windows: RuntimeWindows;
  safety: RuntimeSafety;
}

// ============================================
// Monitoring Configuration
// ============================================

export interface MonitoringConfig {
  enabled: boolean;
  dashboardPort: number;
  metricsIntervalMs: number;
  alertCheckIntervalMs: number;
}

// ============================================
// System Configuration
// ============================================

export interface SystemConfig {
  obs: OBSConfig;
  douyin: DouyinConfig;
  runtime: RuntimeConfig;
  monitoring: MonitoringConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: SystemConfig = {
  obs: {
    host: process.env.OBS_HOST || 'localhost',
    port: parseInt(process.env.OBS_PORT || '4455'),
    password: process.env.OBS_PASSWORD || '',
    autoReconnect: true,
    reconnectInterval: 5000,
  },

  douyin: {
    apiKey: process.env.DOUYIN_API_KEY,
    apiSecret: process.env.DOUYIN_API_SECRET,
    roomId: process.env.DOUYIN_ROOM_ID,
    useFakeData: process.env.USE_FAKE_DATA !== 'false', // 默认使用模拟数据
  },

  runtime: {
    thresholds: {
      hookDurationMax: 4,
      avgAttentionMin: 0.5,
      dropRiskMax: 0.6,
      mutationStepSizeMax: 0.3,
      convergenceScoreMin: 0.7,
    },
    windows: {
      attentionAggregationMs: 5000,
      intentContextSize: 10,
      momentumCalculationMs: 15000,
    },
    safety: {
      maxMutationCycles: 100,
      stabilityTestCycles: 100,
    },
  },

  monitoring: {
    enabled: true,
    dashboardPort: parseInt(process.env.DASHBOARD_PORT || '8080'),
    metricsIntervalMs: 10000,
    alertCheckIntervalMs: 10000,
  },

  logLevel: (process.env.LOG_LEVEL as any) || 'info',
};

// ============================================
// Configuration Manager
// ============================================

export class ConfigManager {
  private config: SystemConfig;

  constructor(customConfig?: Partial<SystemConfig>) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, customConfig);
  }

  /**
   * 获取完整配置
   */
  getConfig(): SystemConfig {
    return this.config;
  }

  /**
   * 获取 OBS 配置
   */
  getOBSConfig(): OBSConfig {
    return this.config.obs;
  }

  /**
   * 获取抖音配置
   */
  getDouyinConfig(): DouyinConfig {
    return this.config.douyin;
  }

  /**
   * 获取运行时配置
   */
  getRuntimeConfig(): RuntimeConfig {
    return this.config.runtime;
  }

  /**
   * 获取监控配置
   */
  getMonitoringConfig(): MonitoringConfig {
    return this.config.monitoring;
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<SystemConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  /**
   * 从文件加载配置
   */
  loadFromFile(filePath: string): void {
    try {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);
      this.config = this.mergeConfig(this.config, fileConfig);
      console.log(`[ConfigManager] 配置已从 ${filePath} 加载`);
    } catch (error) {
      console.error(`[ConfigManager] 加载配置文件失败:`, error);
    }
  }

  /**
   * 保存配置到文件
   */
  saveToFile(filePath: string): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
      console.log(`[ConfigManager] 配置已保存到 ${filePath}`);
    } catch (error) {
      console.error(`[ConfigManager] 保存配置文件失败:`, error);
    }
  }

  /**
   * 合并配置
   */
  private mergeConfig(
    base: SystemConfig,
    custom?: Partial<SystemConfig>
  ): SystemConfig {
    if (!custom) return base;

    return {
      obs: { ...base.obs, ...custom.obs },
      douyin: { ...base.douyin, ...custom.douyin },
      runtime: {
        thresholds: { ...base.runtime.thresholds, ...custom.runtime?.thresholds },
        windows: { ...base.runtime.windows, ...custom.runtime?.windows },
        safety: { ...base.runtime.safety, ...custom.runtime?.safety },
      },
      monitoring: { ...base.monitoring, ...custom.monitoring },
      logLevel: custom.logLevel || base.logLevel,
    };
  }

  /**
   * 验证配置
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 OBS 配置
    if (!this.config.obs.host) {
      errors.push('OBS host is required');
    }
    if (this.config.obs.port <= 0 || this.config.obs.port > 65535) {
      errors.push('OBS port must be between 1 and 65535');
    }

    // 验证抖音配置
    if (!this.config.douyin.useFakeData) {
      if (!this.config.douyin.apiKey) {
        errors.push('Douyin API key is required when not using fake data');
      }
      if (!this.config.douyin.apiSecret) {
        errors.push('Douyin API secret is required when not using fake data');
      }
    }

    // 验证运行时配置
    if (this.config.runtime.thresholds.avgAttentionMin < 0 || this.config.runtime.thresholds.avgAttentionMin > 1) {
      errors.push('avgAttentionMin must be between 0 and 1');
    }

    // 验证监控配置
    if (this.config.monitoring.dashboardPort <= 0 || this.config.monitoring.dashboardPort > 65535) {
      errors.push('Dashboard port must be between 1 and 65535');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 打印配置
   */
  print(): void {
    console.log('\n========================================');
    console.log('Livestream OS Configuration');
    console.log('========================================');
    console.log('\nOBS:');
    console.log(`  Host: ${this.config.obs.host}`);
    console.log(`  Port: ${this.config.obs.port}`);
    console.log(`  Auto Reconnect: ${this.config.obs.autoReconnect}`);

    console.log('\nDouyin:');
    console.log(`  Use Fake Data: ${this.config.douyin.useFakeData}`);
    if (!this.config.douyin.useFakeData) {
      console.log(`  Room ID: ${this.config.douyin.roomId || 'Not set'}`);
    }

    console.log('\nRuntime:');
    console.log(`  Hook Duration Max: ${this.config.runtime.thresholds.hookDurationMax}s`);
    console.log(`  Avg Attention Min: ${this.config.runtime.thresholds.avgAttentionMin}`);
    console.log(`  Attention Aggregation: ${this.config.runtime.windows.attentionAggregationMs}ms`);

    console.log('\nMonitoring:');
    console.log(`  Enabled: ${this.config.monitoring.enabled}`);
    console.log(`  Dashboard Port: ${this.config.monitoring.dashboardPort}`);

    console.log('\nLog Level:', this.config.logLevel);
    console.log('========================================\n');
  }
}

// 全局配置管理器
export const configManager = new ConfigManager();
