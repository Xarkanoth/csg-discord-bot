require('dotenv').config();
const axios = require('axios');

// Map of server UUIDs to human-friendly names
const SERVER_LIST = {
  "baee3b26-4966-4afa-8aab-e42ecde3afd3": "HOLDFAST - CSG Monday EU Linebattle",
    "813ec9c4-a9c8-4f0c-bb6d-3ebca7538b70": "HOLDFAST - CSG Monday EU Naval",
    "3db17e07-a1bb-43f4-8c37-3cc895f2b5dd": "HOLDFAST - CSG Artillery Training",
    "c3e4f638-66f9-4151-91be-31484caa927d": "HOLDFAST - CSG Melee Training",
    "64e4c362-43b3-4f5e-a359-c6787494ca91": "HOLDFAST - CSG Commander Battles",
    "e97297d2-4888-4898-b2ec-4193dc9a45fc": "HOLDFAST - CSG Promotions",
    "a25fff28-4be8-4772-98e9-caec5efa0228": "HOLDFAST - CSG Mod Testing",
    "9d469366-6f40-43d6-a708-f5e683237cf8": "Project Zomboid"
};

// Stores last known state
const lastStatuses = {};

const clientHeader = {
  headers: {
    Authorization: `Bearer ${process.env.PTERO_API_KEY}`,
    Accept: "application/json"
  }
};

const adminHeader = {
  headers: {
    Authorization: `Bearer ${process.env.PTERO_ADMIN_KEY}`,
    Accept: "application/json"
  }
};

// Get current state of a server
async function getServerStatus(serverId) {
  try {
    const url = `${process.env.PTERO_PANEL_URL}/api/client/servers/${serverId}/resources`;
    const response = await axios.get(url, clientHeader);
    return response.data.attributes.current_state;
  } catch (error) {
    console.error(`[ERROR] Could not fetch status for ${serverId}: ${error.message}`);
    return null;
  }
}

// Get the last user who stopped a server via the audit log
async function getLastStopUser(serverId) {
  try {
    const url = `${process.env.PTERO_PANEL_URL}/api/application/audit-logs`;
    const response = await axios.get(url, adminHeader);
    const logs = response.data.data;

    const recent = logs.find(log =>
      log.attributes.event === "server:power" &&
      log.attributes.metadata.server === serverId &&
      log.attributes.metadata.signal === "stop"
    );

    return recent?.attributes.user || "Unknown";
  } catch (error) {
    console.error(`[ERROR] Could not fetch audit logs: ${error.message}`);
    return "Unknown";
  }
}

// Main monitoring function
async function checkServers(sendAlert) {
  for (const [serverId, name] of Object.entries(SERVER_LIST)) {
    const currentStatus = await getServerStatus(serverId);
    if (!currentStatus) continue;

    const lastStatus = lastStatuses[serverId] || "unknown";

    if (currentStatus !== lastStatus) {
      if (currentStatus === "offline") {
        const user = await getLastStopUser(serverId);
        sendAlert(`🛑 **${name}** was stopped by **${user}**`);
      } else if (currentStatus === "running" && lastStatus !== "running") {
        sendAlert(`✅ **${name}** has started or restarted.`);
      }

      lastStatuses[serverId] = currentStatus;
    }
  }
}

// Expose function to bot.js
module.exports = {
  startMonitoring: (sendAlert) => {
    setInterval(() => checkServers(sendAlert), 10000);
  }
};
