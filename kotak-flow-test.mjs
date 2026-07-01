// kotak-flow-test.mjs

/**
 * Run:
 * node kotak-flow-test.mjs
 *
 * Requires Node.js 18+ because it uses built-in fetch.
 *
 * IMPORTANT:
 * Do not commit this file with real credentials.
 */

const config = {
  // Kotak login base URL
  loginBaseUrl: "https://mis.kotaksecurities.com",

  // Fill these locally
  consumerKey: "",
  mobileNumber: "",
  ucc: "",
  totp: "",
  mpin: "",

  // Test APIs after login
  testPositions: true,
  testHoldings: true,
};

async function apiRequest({ method, url, headers = {}, body }) {
  console.log("\n----------------------------------------");
  console.log(`${method} ${url}`);
  console.log("----------------------------------------");

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
       "neo-fin-key": "neotradeapi",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  console.log("Status:", response.status);
  console.log("Response:");
  console.dir(json, { depth: null });

  if (!response.ok) {
    throw new Error(`API failed with status ${response.status}`);
  }

  return json;
}

async function tradeApiLogin() {
  const url = `${config.loginBaseUrl}/login/1.0/tradeApiLogin`;

  return apiRequest({
    method: "POST",
    url,
    headers: {
      Authorization: `${config.consumerKey}`,
       "neo-fin-key": "neotradeapi",
    },
    body: {
      mobileNumber: config.mobileNumber,
      ucc: config.ucc,
      totp: config.totp,
    },
  });
}

async function tradeApiValidate({ authToken, sid }) {
  const url = `${config.loginBaseUrl}/login/1.0/tradeApiValidate`;

  return apiRequest({
    method: "POST",
    url,
    headers: {
    Authorization: `${config.consumerKey}`,
      Auth: authToken,
      Sid: sid,
       "neo-fin-key": "neotradeapi",
    },
    body: {
      mpin: config.mpin,
    },
  });
}

async function getPositions({ baseUrl, tradingToken, tradingSid }) {
  const url = `${baseUrl}/quick/user/positions`;

  return apiRequest({
    method: "GET",
    url,
    headers: {
      Auth: tradingToken,
      Sid: tradingSid,
       "neo-fin-key": "neotradeapi",
    },
  });
}

async function getHoldings({ baseUrl, tradingToken, tradingSid }) {
  const url = `${baseUrl}/portfolio/v1/holdings`;

  return apiRequest({
    method: "GET",
    url,
    headers: {
      Auth: tradingToken,
      Sid: tradingSid,
       "neo-fin-key": "neotradeapi",
    },
  });
}

async function main() {
  try {
    console.log("Starting Kotak API flow...");

    // Step 1: Login with TOTP
    const loginResponse = await tradeApiLogin();

    const loginData = loginResponse.data;

    if (!loginData?.token || !loginData?.sid) {
      throw new Error("tradeApiLogin did not return token or sid");
    }

    console.log("\n✅ Step 1 success: tradeApiLogin");
    console.log("View Token received:", Boolean(loginData.token));
    console.log("SID:", loginData.sid);
    console.log("UCC:", loginData.ucc);
    console.log("Data Center:", loginData.dataCenter);

    // Step 2: Validate MPIN
    const validateResponse = await tradeApiValidate({
      authToken: loginData.token,
      sid: loginData.sid,
    });

    const validateData = validateResponse.data;

    if (!validateData?.token || !validateData?.sid || !validateData?.baseUrl) {
      throw new Error("tradeApiValidate did not return token, sid, or baseUrl");
    }

    console.log("\n✅ Step 2 success: tradeApiValidate");
    console.log("Trading Token received:", Boolean(validateData.token));
    console.log("Trading SID:", validateData.sid);
    console.log("Base URL:", validateData.baseUrl);
    console.log("UCC:", validateData.ucc);
    console.log("Data Center:", validateData.dataCenter);

    // Step 3: Test positions
    if (config.testPositions) {
      await getPositions({
        baseUrl: validateData.baseUrl,
        tradingToken: validateData.token,
        tradingSid: validateData.sid,
      });

      console.log("\n✅ Step 3 success: positions API");
    }

    // Step 4: Test holdings
    if (config.testHoldings) {
      await getHoldings({
        baseUrl: validateData.baseUrl,
        tradingToken: validateData.token,
        tradingSid: validateData.sid,
      });

      console.log("\n✅ Step 4 success: holdings API");
    }

    console.log("\n🎉 Full Kotak flow completed successfully.");
  } catch (error) {
    console.error("\n❌ Kotak flow failed:");
    console.error(error);
  }
}

main();