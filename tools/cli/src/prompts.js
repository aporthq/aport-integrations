'use strict';

const readline = require('readline');

function createInterface() {
  return readline.createInterface({ input: process.stdin, output: process.stderr });
}

function question(rl, text, def) {
  const display = def ? `${text} (${def}) ` : `${text} `;
  return new Promise((resolve) => {
    rl.question(display, (ans) => {
      resolve(ans.trim() || def || '');
    });
  });
}

async function prompt(text, choices, defaultChoice) {
  const rl = createInterface();
  try {
    if (Array.isArray(choices)) {
      const def = defaultChoice || choices[0];
      const idx = choices.indexOf(def);
      console.error(`  ${choices.map((c, i) => (i === idx ? `❯ ${c}` : `  ${c}`)).join('\n  ')}`);
      const ans = await question(rl, '', def);
      if (choices.includes(ans)) { rl.close(); return ans; }
      rl.close(); return def;
    }
    const ans = await question(rl, text, choices);
    rl.close();
    return ans;
  } catch {
    rl.close();
    throw Error('Prompt cancelled');
  }
}

module.exports = { prompt, promptApiKey: prompt };
