const DEFAULT = {
  minCards: 2,
  maxCards: 6,
  // card id selection range for demo (inclusive)
  minCardId: 1,
  maxCardId: 121,
  simulatedPlayers: Number(process.env.BOT_SIMULATED_PLAYERS || 1),
  botDefaultStake: 10,
  // demo winner names (array) initialized from env if present
  demoWinnerNames: (process.env.SIM_BINGO_DEMO_WINNER_NAMES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // enabled by default unless explicitly set to "false" in env
  enabled:
    process.env.BOT_ENABLED === undefined
      ? true
      : process.env.BOT_ENABLED === "true",
};

let config = { ...DEFAULT };

export function getConfig() {
  return { ...config };
}

export function updateConfig(partial) {
  config = { ...config, ...partial };
  // normalize numeric fields
  config.minCards = Number(config.minCards || 1);
  config.maxCards = Math.min(
    6,
    Math.max(config.minCards, Number(config.maxCards || config.minCards)),
  );
  // normalize card id range
  config.minCardId = Math.max(1, Number(config.minCardId || 1));
  config.maxCardId = Math.max(
    config.minCardId,
    Number(config.maxCardId || Math.max(100, config.minCardId)),
  );
  config.simulatedPlayers = Math.min(
    10,
    Math.max(1, Number(config.simulatedPlayers || 1)),
  );
  config.botDefaultStake = Number(
    config.botDefaultStake || DEFAULT.botDefaultStake,
  );
  // normalize demo winner names: accept string (comma-separated) or array
  if (typeof config.demoWinnerNames === "string") {
    config.demoWinnerNames = config.demoWinnerNames
      .split(",")
      .map((s) => String(s || "").trim())
      .filter(Boolean);
  } else if (Array.isArray(config.demoWinnerNames)) {
    config.demoWinnerNames = config.demoWinnerNames
      .map((s) => String(s || "").trim())
      .filter(Boolean);
  } else {
    config.demoWinnerNames = DEFAULT.demoWinnerNames.slice();
  }
  // ensure enabled is boolean
  if (typeof config.enabled === "string") {
    config.enabled = config.enabled === "true";
  } else {
    config.enabled = Boolean(config.enabled);
  }
  return getConfig();
}

export default { getConfig, updateConfig };
