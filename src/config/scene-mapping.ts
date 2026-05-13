/**
 * 场景名称映射配置
 * 
 * 将代码中的场景名称映射到实际的 OBS 场景名称
 */

export interface SceneMapping {
  // 代码中的场景名称 → OBS 实际场景名称
  [codeName: string]: string;
}

/**
 * 场景名称映射配置
 * 
 * 左侧：代码中使用的场景名称
 * 右侧：OBS 中实际创建的场景名称
 */
export const SCENE_MAPPING: SceneMapping = {
  // 核心场景
  'hook': '开场欢迎',                    // 开场钩子场景
  'narration': '产品展示',               // 产品讲解场景
  'stats': '喂食演示',                   // 数据展示/演示场景
  'cta': '优惠活动',                     // 行动号召场景
  'qa': '产品展示',                      // 问答场景（复用产品展示）
  'idle': '开场欢迎',                    // 待机场景（复用开场欢迎）
  
  // 特定场景
  'price_promotion': '优惠活动',         // 价格促销场景
  'interactive_hook': '开场欢迎',        // 互动钩子场景
  'checkout_guide': '优惠活动',          // 下单引导场景
  'product_intro': '产品展示',           // 产品介绍场景
  'picky_eating_demo': '喂食演示',       // 适口性演示场景
};

/**
 * 获取映射后的场景名称
 */
export function getMappedSceneName(codeSceneName: string): string {
  return SCENE_MAPPING[codeSceneName] || codeSceneName;
}

/**
 * 获取所有映射的场景名称（用于验证）
 */
export function getAllMappedScenes(): string[] {
  return [...new Set(Object.values(SCENE_MAPPING))];
}

/**
 * 验证场景映射
 * 
 * @param availableScenes OBS 中实际可用的场景列表
 * @returns 缺失的场景列表
 */
export function validateSceneMapping(availableScenes: string[]): string[] {
  const mappedScenes = getAllMappedScenes();
  const missingScenes: string[] = [];
  
  for (const scene of mappedScenes) {
    if (!availableScenes.includes(scene)) {
      missingScenes.push(scene);
    }
  }
  
  return missingScenes;
}
