import { providers } from './translation-api.js';

export const configKey = 'translationApiConfig';

export async function loadConfig() {
  const data = await chrome.storage.local.get(configKey);
  const config = data[configKey];
  if (!config || !Object.hasOwn(providers, config.provider) ||
      typeof config.model !== 'string' || typeof config.key !== 'string') {
    return { provider: 'deepseek', model: providers.deepseek.model, key: '' };
  }
  return config;
}

export async function saveConfig(provider, model, enteredKey) {
  if (!Object.hasOwn(providers, provider)) throw new Error('请选择可用的 API 服务。');
  const current = await loadConfig();
  const key = enteredKey.trim() || (provider === current.provider ? current.key : '');
  if (!key || !model.trim()) throw new Error('请填写该服务的 API Key 和模型名称。');

  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const config = { provider, model: model.trim(), key };
  await chrome.storage.local.set({ [configKey]: config });
  return config;
}

export async function forgetKey() {
  const config = await loadConfig();
  const cleared = { ...config, key: '' };
  await chrome.storage.local.set({ [configKey]: cleared });
  return cleared;
}
