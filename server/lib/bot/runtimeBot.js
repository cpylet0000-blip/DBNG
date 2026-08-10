let runtimeBot = null;

export function setRuntimeBot(botInstance) {
  runtimeBot = botInstance || null;
}

export function getRuntimeBot() {
  return runtimeBot;
}

