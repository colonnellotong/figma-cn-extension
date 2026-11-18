import { sourceItems, translateItems } from './translation-api.js';
import { configKey, loadConfig } from './api-settings.js';

const el = id => document.getElementById(id);
const inputIds = ['source', 'split-lines', 'languages', 'instructions'];
let request;

function status(message, error = false) {
  el('status').textContent = message;
  el('status').classList.toggle('error', error);
}

function setBusy(busy) {
  el('generate').disabled = busy;
  el('cancel').hidden = !busy;
  inputIds.forEach(id => { el(id).disabled = busy; });
}

function clearPreview() {
  el('preview').replaceChildren();
  el('preview').hidden = true;
}

function showSetupHint(config) {
  el('setup-hint').hidden = !!config?.key;
}

function copyButton(label, text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      status('已复制译文。');
    } catch {
      status('剪贴板不可用。可选择译文后手动复制。', true);
    }
  });
  return button;
}

function showPreview(results) {
  const preview = el('preview');
  preview.replaceChildren();
  for (const { language, rows } of results) {
    const group = document.createElement('section');
    group.className = 'result-group';
    const heading = document.createElement('div');
    heading.className = 'result-heading';
    const title = document.createElement('h3');
    title.textContent = language + ' · 译文预览';
    heading.append(title, copyButton('复制全部', rows.map(row => row.target).join('\n')));
    group.append(heading);
    for (const { source, target } of rows) {
      if (!source.trim()) continue;
      const pair = document.createElement('div');
      pair.className = 'pair';
      const original = document.createElement('p');
      original.textContent = source;
      original.className = 'source-text';
      const translation = document.createElement('p');
      translation.textContent = target;
      pair.append(original, translation, copyButton('复制这条', target));
      group.append(pair);
    }
    preview.append(group);
  }
  preview.hidden = false;
}

el('translate-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (request) return;
  const languages = [...new Set(el('languages').value.split(/[,，、;；\n]+/).map(value => value.trim()).filter(Boolean))];
  if (!languages.length || languages.length > 8) {
    status('请填写 1 至 8 种目标语言。', true);
    return;
  }

  clearPreview();
  request = new AbortController();
  setBusy(true);
  try {
    const items = sourceItems(el('source').value, el('split-lines').checked);
    const config = await loadConfig();
    showSetupHint(config);
    if (!config.key) throw new Error('请先在「设置」保存 API Key。');
    config.instructions = el('instructions').value.trim();
    const results = await translateItems(config, items, languages, request.signal, (language, batch, total) => {
      status('正在翻译到 ' + language + ' · 第 ' + batch + ' / ' + total + ' 批');
    });
    showPreview(results);
    status('已生成 ' + languages.length + ' 种语言的译文。');
  } catch (error) {
    if (request.signal.aborted) status('已取消生成。');
    else if (error.name === 'TimeoutError') status('API 响应超时，请稍后重试。', true);
    else if (error instanceof TypeError) status('无法连接 API，请检查网络后重试。', true);
    else status(error.message, true);
  } finally {
    request = null;
    setBusy(false);
  }
});

el('open-settings').addEventListener('click', async () => {
  try {
    await chrome.runtime.openOptionsPage();
  } catch {
    status('无法打开 API 设置，请从扩展菜单打开设置。', true);
  }
});
el('cancel').addEventListener('click', () => request?.abort());
inputIds.forEach(id => el(id).addEventListener('input', () => {
  clearPreview();
  status('');
}));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[configKey]) showSetupHint(changes[configKey].newValue);
});
loadConfig().then(showSetupHint).catch(() => status('无法读取本地设置，请重新打开侧栏。', true));
