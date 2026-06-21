export const EXAMPLE_TRACE_DATA = {
  totalDurationMs: 255, // Fixed to fit the maximum boundary child node safely
  rootSpan: {
    name: 'frontend',
    startMs: 0,
    durationMs: 255, // Expanded to contain all downstream asynchronous cascades
    colorHex: '#4caf50',
    input: JSON.stringify(
      {
        orderId: '88231',
        expressShipping: true,
        customerId: 'usr_99x77a2',
        items: [
          { sku: 'SKU-882', qty: 2, price: 49.99 },
          { sku: 'SKU-104', qty: 1, price: 9.5 },
        ],
        metadata: {
          clientIp: '192.168.1.1',
          gateway: 'stripe_v3',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      },
      null,
      2,
    ),
    output:
      "Order accepted successfully. Job dispatched to background worker queue 'high_priority'.",
    events: [
      { name: 'DOMReady', timestampMs: 15 },
      { name: 'FetchAuthStarted', timestampMs: 25 },
    ],
    children: [
      {
        name: 'auth',
        startMs: 25,
        durationMs: 225, // Wraps around everything it orchestrates downstream
        colorHex: '#ffb300',
        input: JSON.stringify(
          { tokenType: 'Bearer', scope: 'write:orders' },
          null,
          2,
        ),
        output: "Token decoded. Valid session sub='peter_mq'.",
        events: [
          { name: 'CacheMiss', timestampMs: 30 },
          { name: 'DecryptToken', timestampMs: 55 },
        ],
        children: [
          {
            name: 'internal',
            startMs: 60,
            durationMs: 190, // Wraps inside parent auth context bounds
            colorHex: '#4caf50',
            children: [
              {
                name: 'payment-gateway',
                startMs: 75,
                durationMs: 175, // 75 + 175 = 250ms (inside internal's 250ms absolute cap)
                colorHex: '#f44336',
                input: JSON.stringify(
                  { amount: 109.48, currency: 'USD' },
                  null,
                  2,
                ),
                events: [{ name: 'DBConnectionPoolLock', timestampMs: 80 }],
                children: [
                  {
                    name: 'ProcessAuthorization',
                    startMs: 85,
                    durationMs: 160, // 85 + 160 = 245ms
                    colorHex: '#f44336',
                    events: [{ name: 'GCRun_Spike', timestampMs: 135 }],
                    children: [
                      {
                        name: 'external-call',
                        startMs: 220,
                        durationMs: 25, // 220 + 25 = 245ms (perfectly fits inside parent)
                        colorHex: '#f44336',
                        input:
                          "{ endpoint: 'https://api.stripe.com/v3/charges' }",
                        output: "{ status: 'succeeded', chargeId: 'ch_3MxsY' }",
                        children: [],
                      },
                    ],
                  },
                  {
                    name: 'ext_request',
                    startMs: 90,
                    durationMs: 155, // 90 + 155 = 245ms
                    colorHex: '#f44336',
                    children: [
                      {
                        name: 'nested-auth-verify',
                        startMs: 95,
                        durationMs: 40, // 95 + 40 = 135ms
                        colorHex: '#ffb300',
                        input: JSON.stringify(
                          { tokenType: 'Bearer', scope: 'write:orders' },
                          null,
                          2,
                        ),
                        output: 'Token verified via sidecar sync check.',
                        events: [
                          { name: 'CacheMiss', timestampMs: 100 },
                          { name: 'DecryptToken', timestampMs: 120 },
                        ],
                        children: [
                          {
                            name: 'internal-cache-lookup',
                            startMs: 105,
                            durationMs: 15, // 105 + 15 = 120ms
                            colorHex: '#4caf50',
                            children: [
                              {
                                name: 'redis-cluster-ping',
                                startMs: 110,
                                durationMs: 10, // 110 + 10 = 120ms
                                colorHex: '#f44336',
                                input: JSON.stringify(
                                  { clusterNode: 'redis_node_01' },
                                  null,
                                  2,
                                ),
                                events: [
                                  {
                                    name: 'CacheHitConfirmed',
                                    timestampMs: 115,
                                  },
                                ],
                                children: [],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'external-call-secondary',
                    startMs: 220,
                    durationMs: 25, // 220 + 25 = 245ms
                    colorHex: '#f44336',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
}
