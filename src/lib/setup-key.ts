/**
 * 首次初始化向导密钥。
 *
 * 此模块只允许服务端 Route Handler 引用，禁止被客户端组件导入。
 * 密钥由部署环境通过 SETUP_KEY 注入，不写入源码。
 */
export function getSetupKey(): string {
  const setupKey = process.env.SETUP_KEY?.trim();
  if (!setupKey) throw new Error('SETUP_KEY is not set');
  return setupKey;
}
