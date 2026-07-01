// angel-flow-test.mjs

/**
 * Run:
 * node angel-flow-test.mjs
 *
 * Requires:
 * npm install ws
 *
 * Do not commit this file with real credentials.
 */

import WebSocket from "ws";

const config = {
  baseUrl: "https://apiconnect.angelone.in",

  // Fill these
  apiKey: "",
  clientCode: "",
  mpin: "",
  totp: "",

  // Required headers
  localIp: "127.0.0.1",
  publicIp: "127.0.0.1",
  macAddress: "",

  // Test symbol: SBIN equity
  testExchange: "NSE",
  testTradingSymbol: "SBIN-EQ",
  testSymbolToken: "3045",

  // Historical candle test
  candleInterval: "ONE_MINUTE",
  fromDate: "2026-07-01 09:15",
  toDate: "2026-07-01 09:30",

  // REST tests
  testProfile: true,
  testFunds: true,
  testHoldings: true,
  testPositions: true,
  testOrderBook: true,
  testTradeBook: true,
  testLtp: true,
  testMarketData: true,
  testCandleData: true,

  // WebSocket test
  testWebSocket: true,
};

let session = {
  jwtToken: "",
  refreshToken: "",
  feedToken: "",
};

function baseHeaders(extra = {}) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-UserType": "USER",
    "X-SourceID": "WEB",
    "X-ClientLocalIP": config.localIp,
    "X-ClientPublicIP": config.publicIp,
    "X-MACAddress": config.macAddress,
    "X-PrivateKey": config.apiKey,
    ...extra,
  };
}

function authHeaders(extra = {}) {
  return baseHeaders({
    Authorization: `Bearer ${session.jwtToken}`,
    ...extra,
  });
}

async function apiRequest({ method, path, headers = {}, body, allowFailure = false }) {
  const url = `${config.baseUrl}${path}`;

  console.log("\n----------------------------------------");
  console.log(`${method} ${url}`);
  console.log("----------------------------------------");

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  console.log("Status:", response.status);
  console.log("Response:");
  console.dir(data, { depth: null });

  if (!response.ok && !allowFailure) {
    throw new Error(`API failed with status ${response.status}`);
  }

  return data;
}

async function login() {
  const response = await apiRequest({
    method: "POST",
    path: "/rest/auth/angelbroking/user/v1/loginByPassword",
    headers: baseHeaders(),
    body: {
      clientcode: config.clientCode,
      password: config.mpin,
      totp: config.totp,
    },
  });

  const data = response?.data;

  if (!data?.jwtToken || !data?.refreshToken || !data?.feedToken) {
    throw new Error("Login failed: jwtToken / refreshToken / feedToken missing");
  }

  session.jwtToken = data.jwtToken;
  session.refreshToken = data.refreshToken;
  session.feedToken = data.feedToken;

  console.log("\n✅ Login success");
  console.log("JWT Token:", Boolean(session.jwtToken));
  console.log("Refresh Token:", Boolean(session.refreshToken));
  console.log("Feed Token:", Boolean(session.feedToken));
}

async function getProfile() {
  return apiRequest({
    method: "GET",
    path: "/rest/secure/angelbroking/user/v1/getProfile",
    headers: authHeaders(),
  });
}

async function getFunds() {
  return apiRequest({
    method: "GET",
    path: "/rest/secure/angelbroking/user/v1/getRMS",
    headers: authHeaders(),
    allowFailure: true,
  });
}

async function getHoldings() {
  return apiRequest({
    method: "GET",
    path: "/rest/secure/angelbroking/portfolio/v1/getHolding",
    headers: authHeaders(),
    allowFailure: true,
  });
}

async function getPositions() {
  return apiRequest({
    method: "GET",
    path: "/rest/secure/angelbroking/order/v1/getPosition",
    headers: authHeaders(),
    allowFailure: true,
  });
}

async function getOrderBook() {
  return apiRequest({
    method: "GET",
    path: "/rest/secure/angelbroking/order/v1/getOrderBook",
    headers: authHeaders(),
    allowFailure: true,
  });
}

async function getTradeBook() {
  return apiRequest({
    method: "GET",
    path: "/rest/secure/angelbroking/order/v1/getTradeBook",
    headers: authHeaders(),
    allowFailure: true,
  });
}

async function getLtp() {
  return apiRequest({
    method: "POST",
    path: "/rest/secure/angelbroking/order/v1/getLtpData",
    headers: authHeaders(),
    body: {
      exchange: config.testExchange,
      tradingsymbol: config.testTradingSymbol,
      symboltoken: config.testSymbolToken,
    },
    allowFailure: true,
  });
}

async function getMarketData() {
  return apiRequest({
    method: "POST",
    path: "/rest/secure/angelbroking/market/v1/quote",
    headers: authHeaders(),
    body: {
      mode: "FULL",
      exchangeTokens: {
        [config.testExchange]: [config.testSymbolToken],
      },
    },
    allowFailure: true,
  });
}

async function getCandleData() {
  return apiRequest({
    method: "POST",
    path: "/rest/secure/angelbroking/historical/v1/getCandleData",
    headers: authHeaders(),
    body: {
      exchange: config.testExchange,
      symboltoken: config.testSymbolToken,
      interval: config.candleInterval,
      fromdate: config.fromDate,
      todate: config.toDate,
    },
    allowFailure: true,
  });
}

function testWebSocket() {
  return new Promise((resolve) => {
    console.log("\n----------------------------------------");
    console.log("WebSocket Test");
    console.log("----------------------------------------");

    const ws = new WebSocket("wss://smartapisocket.angelone.in/smart-stream", {
      headers: {
        Authorization: `Bearer ${session.jwtToken}`,
        "x-api-key": config.apiKey,
        "x-client-code": config.clientCode,
        "x-feed-token": session.feedToken,
      },
    });

    const timeout = setTimeout(() => {
      console.log("⏱ WebSocket timeout reached, closing...");
      ws.close();
      resolve();
    }, 15000);

    ws.on("open", () => {
      console.log("✅ WebSocket connected");

      const subscribeMessage = {
        correlationID: "kronos-test-001",
        action: 1,
        params: {
          mode: 1,
          tokenList: [
            {
              exchangeType: 1,
              tokens: [config.testSymbolToken],
            },
          ],
        },
      };

      console.log("Sending subscribe message:");
      console.dir(subscribeMessage, { depth: null });

      ws.send(JSON.stringify(subscribeMessage));
    });

    ws.on("message", (data) => {
      console.log("✅ WebSocket message received:");
      console.log(data);
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error:");
      console.error(error);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      console.log("WebSocket closed");
      resolve();
    });
  });
}

async function main() {
  try {
    console.log("Starting Angel One SmartAPI test flow...");

    await login();

    if (config.testProfile) {
      await getProfile();
      console.log("\n✅ Profile API tested");
    }

    if (config.testFunds) {
      await getFunds();
      console.log("\n✅ Funds/RMS API tested");
    }

    if (config.testHoldings) {
      await getHoldings();
      console.log("\n✅ Holdings API tested");
    }

    if (config.testPositions) {
      await getPositions();
      console.log("\n✅ Positions API tested");
    }

    if (config.testOrderBook) {
      await getOrderBook();
      console.log("\n✅ Order Book API tested");
    }

    if (config.testTradeBook) {
      await getTradeBook();
      console.log("\n✅ Trade Book API tested");
    }

    if (config.testLtp) {
      await getLtp();
      console.log("\n✅ LTP API tested");
    }

    if (config.testMarketData) {
      await getMarketData();
      console.log("\n✅ Market Data API tested");
    }

    if (config.testCandleData) {
      await getCandleData();
      console.log("\n✅ Candle Data API tested");
    }

    if (config.testWebSocket) {
      await testWebSocket();
      console.log("\n✅ WebSocket tested");
    }

    console.log("\n🎉 Angel One SmartAPI test flow completed.");
  } catch (error) {
    console.error("\n❌ Angel One test flow failed:");
    console.error(error);
  }
}

main();