# Slack Channel Reader — OpenClaw Plugin

Read messages and threads from Slack channels directly from your OpenClaw agent.

---

## What It Does

This plugin exposes two tools to OpenClaw agents:

- **`slack_read_channel`** — Fetch the message history of any Slack channel your bot has access to.
- **`slack_read_thread`** — Fetch all replies in a specific Slack thread.

Use it to monitor conversations, summarize discussions, trigger workflows based on channel activity, or give your agent context from Slack.

---

## Required Slack App Scopes

Your Slack Bot Token must have the following OAuth scopes:

| Scope | Purpose |
|---|---|
| `channels:history` | Read messages in public channels |
| `groups:history` | Read messages in private channels the bot is a member of |
| `im:history` | Read direct messages the bot is part of |
| `mpim:history` | Read group DMs the bot is part of |
| `channels:read` | List and look up channel info |

---

## Creating a Slack App & Getting a Bot Token

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**.
2. Choose **From scratch**, give it a name, and select your workspace.
3. In the left sidebar, go to **OAuth & Permissions**.
4. Under **Bot Token Scopes**, add all the scopes listed above.
5. Scroll up and click **Install to Workspace**, then **Allow**.
6. Copy the **Bot User OAuth Token** — it starts with `xoxb-`.
7. Add the bot to any channel it needs to read: in Slack, open the channel → **Integrations** → **Add an App**.

---

## Configuration

`SLACK_BOT_TOKEN` is **optional** when Slack is already configured in your OpenClaw gateway.

| Variable | Required | Description |
|---|---|---|
| `SLACK_BOT_TOKEN` | ❌ Optional | Slack Bot OAuth token (`xoxb-...`). If not set, the plugin automatically reads the token from `channels.slack.botToken` in the OpenClaw gateway config. |

**Token resolution order:**
1. `SLACK_BOT_TOKEN` config/env var (if explicitly set)
2. `openclaw config get channels.slack.botToken` (automatic — no setup needed if Slack is already connected)

---

## Tools

### `slack_read_channel`

Read message history from a Slack channel.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `channel` | string | ✅ | — | Channel ID (e.g. `C12345678`) or name (e.g. `#general` or `general`) |
| `limit` | number | ❌ | `50` | Number of messages to return (max: 200) |
| `oldest` | string | ❌ | — | Unix timestamp — only fetch messages after this time |
| `latest` | string | ❌ | — | Unix timestamp — only fetch messages before this time |

**Returns:**

```json
{
  "ok": true,
  "channel": "C12345678",
  "message_count": 50,
  "has_more": false,
  "messages": [
    {
      "ts": "1713200000.000100",
      "user": "U12345678",
      "text": "Hello team!",
      "thread_ts": null,
      "reply_count": 0,
      "reactions": [{ "name": "thumbsup", "count": 3 }]
    }
  ]
}
```

---

### `slack_read_thread`

Read all replies in a Slack thread.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `channel` | string | ✅ | — | Channel ID containing the thread |
| `thread_ts` | string | ✅ | — | Timestamp of the parent (root) message |
| `limit` | number | ❌ | `100` | Max replies to return (max: 1000) |

**Returns:**

```json
{
  "ok": true,
  "channel": "C12345678",
  "thread_ts": "1713200000.000100",
  "reply_count": 5,
  "messages": [
    {
      "ts": "1713200000.000100",
      "user": "U12345678",
      "text": "Has anyone looked at the deploy logs?",
      "is_root": true
    },
    {
      "ts": "1713200500.000200",
      "user": "U87654321",
      "text": "Yes — looks like a timeout issue.",
      "is_root": false
    }
  ]
}
```

---

## Example Use Cases

- **Channel summarizer** — Read the last 100 messages from `#engineering` and generate a daily summary.
- **Thread monitor** — Watch a specific thread for new replies and alert when a decision is made.
- **Incident tracker** — Pull messages from `#incidents` between two timestamps to build a timeline.
- **Cross-platform awareness** — Give an agent full context from a Slack discussion before it takes action.
- **Q&A assistant** — Read thread replies to understand resolved questions before answering new ones.

---

## Error Handling

If the API returns an error, both tools return:

```json
{ "error": "<slack_error_code>", "messages": [] }
```

Common Slack errors:

| Error | Cause |
|---|---|
| `not_in_channel` | Bot is not a member of the channel |
| `channel_not_found` | Invalid channel ID or name |
| `missing_scope` | Bot token lacks the required scope |
| `invalid_auth` | Token is invalid or revoked |

---

## License

MIT — © Ocana Viva
