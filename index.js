const { WebClient } = require('@slack/web-api');
const { execSync } = require('child_process');

function resolveToken(config) {
  // 1. Explicit config/env var takes priority
  if (config && config.SLACK_BOT_TOKEN) return config.SLACK_BOT_TOKEN;
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;

  // 2. Fall back to OpenClaw gateway config
  try {
    const token = execSync('openclaw config get channels.slack.botToken', {
      encoding: 'utf8',
      timeout: 5000
    }).trim();
    if (token && token.length > 0 && !token.startsWith('Error') && !token.startsWith('null')) {
      return token;
    }
  } catch (e) {
    // openclaw CLI not available or key not set — continue
  }

  throw new Error(
    'slack-channel-reader: No Slack Bot Token found. ' +
    'Set SLACK_BOT_TOKEN env var, or ensure Slack is configured in the OpenClaw gateway.'
  );
}

module.exports = function(config) {
  const token = resolveToken(config);
  const client = new WebClient(token);

  return {
    tools: {
      slack_read_channel: {
        description: 'Read message history from a Slack channel',
        parameters: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID (C...) or name (with or without #)'
            },
            limit: {
              type: 'number',
              description: 'Number of messages to return (default: 50, max: 200)',
              default: 50
            },
            oldest: {
              type: 'string',
              description: 'Oldest timestamp to fetch from (Unix timestamp string)'
            },
            latest: {
              type: 'string',
              description: 'Latest timestamp to fetch to (Unix timestamp string)'
            }
          },
          required: ['channel']
        },
        handler: async ({ channel, limit = 50, oldest, latest }) => {
          try {
            const params = {
              channel,
              limit: Math.min(limit, 200)
            };
            if (oldest) params.oldest = oldest;
            if (latest) params.latest = latest;

            const result = await client.conversations.history(params);

            if (!result.ok) {
              return { error: result.error, messages: [] };
            }

            const messages = (result.messages || []).map(msg => ({
              ts: msg.ts,
              user: msg.user || msg.bot_id || 'unknown',
              text: msg.text || '',
              thread_ts: msg.thread_ts || null,
              reply_count: msg.reply_count || 0,
              reactions: (msg.reactions || []).map(r => ({ name: r.name, count: r.count }))
            }));

            return {
              ok: true,
              channel,
              message_count: messages.length,
              has_more: result.has_more || false,
              messages
            };
          } catch (err) {
            if (err.data && err.data.error) {
              return { error: err.data.error, messages: [] };
            }
            return { error: err.message, messages: [] };
          }
        }
      },

      slack_read_thread: {
        description: 'Read all replies in a Slack thread',
        parameters: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID containing the thread'
            },
            thread_ts: {
              type: 'string',
              description: 'Timestamp of the parent message (thread root)'
            },
            limit: {
              type: 'number',
              description: 'Max number of replies to return (default: 100)',
              default: 100
            }
          },
          required: ['channel', 'thread_ts']
        },
        handler: async ({ channel, thread_ts, limit = 100 }) => {
          try {
            const result = await client.conversations.replies({
              channel,
              ts: thread_ts,
              limit: Math.min(limit, 1000)
            });

            if (!result.ok) {
              return { error: result.error, messages: [] };
            }

            const messages = (result.messages || []).map(msg => ({
              ts: msg.ts,
              user: msg.user || msg.bot_id || 'unknown',
              text: msg.text || '',
              is_root: msg.ts === thread_ts
            }));

            return {
              ok: true,
              channel,
              thread_ts,
              reply_count: messages.length,
              messages
            };
          } catch (err) {
            if (err.data && err.data.error) {
              return { error: err.data.error, messages: [] };
            }
            return { error: err.message, messages: [] };
          }
        }
      }
    }
  };
};