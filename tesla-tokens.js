
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUDIENCE = process.env.AUDIENCE || "https://fleet-api.prd.na.vn.cloud.tesla.com";
const LOCALE = process.env.LOCALE || "en-US";
const DOMAIN = process.env.DOMAIN;
const SCOPE = process.env.SCOPE || "openid user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds energy_device_data energy_cmds offline_access";
const REDIRECT_URL = "https://" + DOMAIN + "/tesla-callback";


async function getPartnerToken() {
    try {
        var response = await fetch(
            'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
            {
                method: 'POST',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    grant_type: "client_credentials",
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    scope: SCOPE,
                    audience: AUDIENCE
                })
            }
        );
        var json = await response.json();
        if (!response.ok) {
            console.log(json);
            throw new Error(`Status ${response.status}, Response ${JSON.stringify(json)}`);
        }
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
    return json.access_token;
}

function getAuthURL(state) {
    return "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/authorize?" + new URLSearchParams({
        client_id: CLIENT_ID,
        locale: LOCALE,
        prompt: "login",
        redirect_uri: REDIRECT_URL,
        response_type: "code",
        scope: SCOPE,
        state: state
    });
}

// Takes code from Tesla auth callback and exchanges it for an access_token (and
// refresh_token if scope allows).
async function doTokenExchange(code) {
    try {
        var request = await fetch("https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token", {
            method: "POST",
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                audience: AUDIENCE,
                redirect_uri: REDIRECT_URL
            })
        });
        var json = await request.json();
        if (!request.ok) {
            console.log(json);
            throw json;
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
    json.expiration = Math.floor(Date.now() / 1000) + json.expires_in;
    return json;
}

async function doRegister() {
    try {
        var request = await fetch(`${AUDIENCE}/api/1/partner_accounts`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + await getPartnerToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                domain: DOMAIN
            })
        });
        var json = await request.json();
        console.log(json);
        if (!request.ok) {
            throw json;
        }
    }
    catch (error) {
        console.log(error);
        throw error;
    }
    return;
}

async function doRefresh(refresh_token) {
    try {
        var request = await fetch("https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token", {
            method: 'POST',
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: CLIENT_ID,
                refresh_token: refresh_token
            })
        });
        var json = await request.json();
        if (!request.ok) {
            err = new Error(`${request.status}: ${JSON.stringify(json)}`)
            throw err;
        }
        json.expiration = Math.floor(Date.now() / 1000) + json.expires_in;
        return json;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

async function getUsername(token) {
    try {
        var request = await fetch(`${AUDIENCE}/api/1/users/me`, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        });
        var json = await request.json();
        if (!request.ok) {
            console.log(json);
            throw json;
        }
    } catch (error) {
        console.log(error);
        throw error;
    }
    return json.response.email;
}

module.exports = { getAuthURL, doTokenExchange, doRefresh, doRegister, getUsername };
