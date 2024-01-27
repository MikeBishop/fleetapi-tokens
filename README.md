# Tesla Fleet API Tokens

Many selfhosted applications have been using Tesla's reverse-engineered
owner-api using tokens retrieved by various tools. Those apps have had to
respond to many breaking changes on Tesla's API surface with little or no prior
notice.

With the move to the [Fleet API](https://developer.tesla.com/docs/fleet-api),
Tesla has finally made an official third-party API surface. The downside is a
registration process that is very much geared toward companies, not consumers.
This aims to help with that problem.

In order to get tokens usable with Tesla's Fleet API, you will need to:

- Obtain a domain name, if you don't already have one. (This needs to be a
  domain you completely control, not just a subdomain on a shared parent
  domain.)
- Register for a [developer account](https://developer.tesla.com) at Tesla
- Submit an application for approval with the following settings:
  - Allowed origin(s): Your domain registered above, or a subdomain of it; e.g.
    https://tesla.example.com
  - Allowed redirect URI(s): The same origin with a path of `/tesla-callback`,
    e.g. https://tesla.example.com/tesla-callback
  - Scopes: Whatever permissions your application(s) will require. This service
    requires at least the "Profile Information" scope for user authentication.
- Deploy this container so that your allowed origin points to it (e.g. at
  https://tesla.example.com), with ports 80 and 443 exposed.

## Deployment Notes

`docker-compose.yml` includes a Traefik proxy for the purpose of obtaining
certificates from Let's Encrypt. Any other TLS-terminating reverse proxy would
also be sufficient -- NPM, Synology, etc. -- provided it has or can obtain a
valid TLS certificate.

This service MUST be accessible from the Internet, but does not need to remain
up continuously. It can be hosted at home using dynamic DNS if port 443 is
available, or on your favorite cloud hosting provider. (Linode, Azure, Amazon
EC2, etc.)

## Configuration

Configuration is read from environment variables:

- ALLOWED_USERS is a comma- or semicolon-separated list of e-mail addresses for
  Tesla accounts allowed to obtain tokens. For example, `elon@tesla.com,
  alice@example.com`. (The "Profile Information" scope is used to check the
  e-mail address of users who attempt to log in.)
- CLIENT_ID is your Tesla Client ID, provided after registering an application
  on the Developer portal.
- CLIENT_SECRET is your Tesla Client Secret, provided after registering an
  application on the Developer portal.
- AUDIENCE is the Fleet API endpoint you need to authenticate against; defaults
  to the North America / Asia-Pacific endpoint
  - North America, Asia-Pacific (excluding China):
    `https://fleet-api.prd.na.vn.cloud.tesla.com`
  - Europe, Middle East, Africa: `https://fleet-api.prd.eu.vn.cloud.tesla.com`
  - China: `https://fleet-api.prd.cn.vn.cloud.tesla.cn`
- LOCALE is the language to be used for login; defaults to `en-US`. (The app
  itself is not currently localized.)
- DOMAIN is the FQDN of the server, e.g. `tesla.example.com`
- SCOPE must match the scopes requested during registration; default is the
  complete set (`openid user_data vehicle_device_data vehicle_cmds
  vehicle_charging_cmds energy_device_data energy_cmds offline_access`). Note
  that `openid user_data offline_access` are required for proper functioning of
  this app.
