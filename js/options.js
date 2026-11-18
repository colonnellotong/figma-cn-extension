import { providers } from './translation-api.js';
import { loadConfig, saveConfig, forgetKey } from './api-settings.js';

const el = id => document.getElementById(id);
let saved;

function status(message, error = false) {
  el('status').textContent = message;
  el('status').classList.toggle('error', error);
}

function updateHint() {
  const hasKey = saved.hasKey && saved.provider === el('provider').value;
  el('api-key').placeholder = hasKey ? '已保存，留空继续使用' : '输入所选服务的 API Key';
  el('forget').disabled = !saved.hasKey;
}

function render(config) {
  saved = { provider: config.provider, model: config.model, hasKey: !!config.key };
  el('provider').value = config.provider;
  el('model').value = config.model;
  el('api-key').value = '';
  updateHint();
}

function setBusy(busy) {
  for (const id of ['provider', 'model', 'api-key', 'save', 'forget']) el(id).disabled = busy;
  if (!busy) updateHint();
}

el('provider').addEventListener('change', () => {
  const provider = el('provider').value;
  el('model').value = saved.provider === provider ? saved.model : providers[provider].model;
  el('api-key').value = '';
  updateHint();
  status('');
});

el('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  setBusy(true);
  try {
    render(await saveConfig(el('provider').value, el('model').value, el('api-key').value));
    status('已保存在本机，可返回侧栏翻译。');
  } catch (error) {
    status(error.message === '请填写该服务的 API Key 和模型名称。' ? error.message : '保存失败，请检查浏览器扩展存储后重试。', true);
  } finally {
    setBusy(false);
  }
});

el('forget').addEventListener('click', async () => {
  setBusy(true);
  try {
    render(await forgetKey());
    status('已清除本地保存的 Key。');
  } catch {
    status('清除失败，请重试。', true);
  } finally {
    setBusy(false);
  }
});

try {
  setBusy(true);
  render(await loadConfig());
  setBusy(false);
} catch {
  status('无法读取本地设置，请重新打开此设置页。', true);
}
