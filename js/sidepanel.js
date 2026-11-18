import { providers, sourceItems, translateItems } from './translation-api.js';

const el = id => document.getElementById(id);
const inputIds = ['source', 'split-lines', 'provider', 'model', 'api-key', 'languages', 'instructions'];
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

function providerChanged() {
  el('model').value = providers[el('provider').value].model;
  el('api-key').value = '';
  clearPreview();
  status('');
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
  const config = {
    provider: el('provider').value,
    model: el('model').value.trim(),
    key: el('api-key').value.trim(),
    instructions: el('instructions').value.trim(),
  };
  const languages = [...new Set(el('languages').value.split(/[,，、;；\n]+/).map(value => value.trim()).filter(Boolean))];
  if (!config.key || !config.model || !languages.length || languages.length > 8) {
    status('请填写 API Key、模型和 1 至 8 种目标语言。', true);
    return;
  }

  clearPreview();
  request = new AbortController();
  setBusy(true);
  try {
    const items = sourceItems(el('source').value, el('split-lines').checked);
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

el('provider').addEventListener('change', providerChanged);
el('cancel').addEventListener('click', () => request?.abort());
inputIds.filter(id => id !== 'provider').forEach(id => el(id).addEventListener('input', () => {
  clearPreview();
  status('');
}));
providerChanged();
