// One place to call the Anthropic Messages API for JSON answers.
// Current models think before answering and that thinking counts toward max_tokens, so the budget is generous and
// effort is set to medium (less thinking, faster, cheaper). Models that do not accept the effort setting are retried
// without it. The reply is parsed tolerantly (code fences, text around the object); a reply that was cut off or is not
// valid JSON is an error, so a broken answer is never stored in place of a good one.
import { fetchText } from './util.js';

export function parseJsonReply(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}

export async function callClaudeJson(key, { model, system, user, maxTokens = 16000, effort = 'medium', tag, timeoutMs = 120000 }) {
  const send = async (withEffort) => {
    const body = { model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] };
    if (withEffort && effort) body.output_config = { effort };
    const text = await fetchText('https://api.anthropic.com/v1/messages', { method: 'POST', timeoutMs, tag, headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return JSON.parse(text);
  };
  let j;
  try { j = await send(true); }
  catch (e) { if (e.status === 400 && /effort|output_config/i.test(e.message)) j = await send(false); else throw e; }
  const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('');
  const json = parseJsonReply(text);
  if (!json) {
    const why = j.stop_reason === 'max_tokens' ? `the reply was cut off at ${maxTokens.toLocaleString('en-US')} output tokens` : 'the reply was not valid JSON';
    throw Object.assign(new Error(`The model answered, but ${why}. Nothing was saved; try again or pick another model.`), { status: 502, usage: j.usage, model: j.model });
  }
  return { json, text, model: j.model, usage: j.usage || null, stopReason: j.stop_reason };
}
