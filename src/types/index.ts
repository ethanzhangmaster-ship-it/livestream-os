/**
 * 核心类型定义
 * 基于 ARCHITECTURE.md 中的接口定义
 */

// ============================================
// Event Types (事件类型)
// ============================================

export type EventType =
  | 'user_enter'
  | 'comment'
  | 'like'
  | 'gift'
  | 'click_cart'
  | 'exit'
  | 'replay';

export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  timestamp: number;
  sessionId: string;
}

export interface CommentEvent extends BaseEvent {
  eventType: 'comment';
  userId: string;
  userName: string;
  content: string;
}

export interface LikeEvent extends BaseEvent {
  eventType: 'like';
  userId: string;
  count: number;
}

export interface GiftEvent extends BaseEvent {
  eventType: 'gift';
  userId: string;
  userName: string;
  giftId: string;
  giftName: string;
  value: number;
}

export interface UserEnterEvent extends BaseEvent {
  eventType: 'user_enter';
  userId: string;
  userName: string;
}

export interface ExitEvent extends BaseEvent {
  eventType: 'exit';
  userId: string;
  watchDuration: number;
}

export interface ClickCartEvent extends BaseEvent {
  eventType: 'click_cart';
  userId: string;
  productId: string;
}

export interface ReplayEvent extends BaseEvent {
  eventType: 'replay';
  userId: string;
  timestamp: number;
}

export type LiveEvent =
  | CommentEvent
  | LikeEvent
  | GiftEvent
  | UserEnterEvent
  | ExitEvent
  | ClickCartEvent
  | ReplayEvent;

// ============================================
// Attention Types (注意力类型)
// ============================================

export type AttentionPattern =
  | 'engagement_high'
  | 'purchase_hesitation'
  | 'drop_risk'
  | 'curiosity_peak'
  | 'boredom'
  | 'confusion';

export interface AttentionState {
  density: number; // 0-1
  momentum: number; // 变化趋势
  topic: string | null; // 当前热点话题
  pattern: AttentionPattern; // 模式识别
  timestamp: number;
}

// ============================================
// Intent Types (意图类型)
// ============================================

export type IntentType =
  | 'product_inquiry'
  | 'purchase_hesitation'
  | 'price_sensitivity'
  | 'comparison'
  | 'objection'
  | 'readiness_signal'
  | 'general_chat';

export interface Intent {
  type: IntentType;
  confidence: number; // 0-1
  subIntent?: string;
  recommendedScene?: string;
  conversionProbability?: 'low' | 'medium' | 'high';
  sourceText: string;
  context: {
    recentComments: string[];
    attentionState: AttentionState;
    sessionDuration: number;
  };
}

// ============================================
// Action Types (动作类型)
// ============================================

export type SceneSwitchAction = {
  type: 'scene_switch';
  target: string;
  transition?: string;
};

export type OverlayShowAction = {
  type: 'overlay_show';
  target: string;
  duration?: number;
};

export type OverlayHideAction = {
  type: 'overlay_hide';
  target: string;
};

export type AutoReplyAction = {
  type: 'auto_reply';
  text: string;
  voice?: boolean;
};

export type ProductHighlightAction = {
  type: 'product_highlight';
  sku: string;
};

export type TextUpdateAction = {
  type: 'text_update';
  element: string;
  content: string;
};

export type StartRecordingAction = {
  type: 'start_recording';
};

export type StopRecordingAction = {
  type: 'stop_recording';
};

export type StartStreamingAction = {
  type: 'start_streaming';
};

export type StopStreamingAction = {
  type: 'stop_streaming';
};

export type Action =
  | SceneSwitchAction
  | OverlayShowAction
  | OverlayHideAction
  | AutoReplyAction
  | ProductHighlightAction
  | TextUpdateAction
  | StartRecordingAction
  | StopRecordingAction
  | StartStreamingAction
  | StopStreamingAction;

// ============================================
// Runtime Decision Types (运行时决策类型)
// ============================================

export interface RuntimeDecision {
  decisionId: string;
  triggerIntent: Intent;
  actions: Action[];
  reasoning: string;
  expectedImpact: {
    attention: number;
    conversion: number;
  };
  timestamp: number;
}

// ============================================
// SceneGraph Types (场景图类型)
// ============================================

export interface SceneNode {
  id: string;
  name: string;
  type: 'hook' | 'narration' | 'stats' | 'cta' | 'demo' | 'qa';
  duration?: number;
  overlays: string[];
  products?: string[];
}

export interface SceneTransition {
  from: string;
  to: string;
  condition?: string;
  priority: number;
}

export interface SceneGraph {
  nodes: Map<string, SceneNode>;
  edges: SceneTransition[];
  activeNode: string;
  history: string[];
}

// ============================================
// Mutation Types (变更类型)
// ============================================

export type MutationType =
  | 'scene_duration'
  | 'overlay_timing'
  | 'transition_speed'
  | 'text_content'
  | 'scene_order'
  | 'response_template';

export interface Mutation {
  mutationId: string;
  type: MutationType;
  change: Record<string, any>;
  proposer: 'optimizer' | 'knowledge_graph' | 'manual';
  expectedImpact: number;
  confidence: number;
  timestamp: number;
}

// ============================================
// Violation Types (违规类型)
// ============================================

export type ViolationSeverity = 'hard' | 'soft';

export interface Violation {
  type: string;
  severity: ViolationSeverity;
  message: string;
  details?: Record<string, any>;
}

// ============================================
// Metrics Types (指标类型)
// ============================================

export interface AttentionMetrics {
  timestamp: number;
  attentionValue: number;
  eventCount: number;
  uniqueUsers: number;
  avgWatchDuration: number;
  conversionRate: number;
}

export interface ImpactResult {
  mutationId: string;
  impact: number;
  confidence: number;
  correlation: number;
}

// ============================================
// Configuration Types (配置类型)
// ============================================

export interface RuntimeConfig {
  thresholds: {
    hookDurationMax: number; // 4s
    avgAttentionMin: number; // 0.5
    dropRiskMax: number; // 0.6
    mutationStepSizeMax: number; // 0.3
    convergenceScoreMin: number; // 0.7
  };
  windows: {
    attentionAggregationMs: number; // 5000ms
    intentContextSize: number; // 10 comments
    momentumCalculationMs: number; // 15000ms
  };
  safety: {
    maxMutationCycles: number; // 100
    stabilityTestCycles: number; // 100
  };
}
