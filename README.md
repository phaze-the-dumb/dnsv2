# PDNSv2

A Work In Progress Proxy DNS Server With Analytics.

## Installation

**Make sure nodejs is installed on your server / pc**

- Clone the repo: `git clone https://github.com/phaze-the-dumb/dnsv2`
- Install Dependencies: `npm i`
- Setup Config `nano config.json` or open with any editor.

Config Setup:
```js
{
    "name": "Phoenix",           // Instance Name
    "appsDir": "apps/files",     // Leave this one
    "useSSL": true,              // Whether the proxy server uses ssl
    "accounts": [
        {
            "username": "phaze", // Account Username
            "password": "test",  // Account Password
            "config": {
                "isAdmin": true  // Whether they have access to the admin page
            }
        }
    ]
}
```

- Run: `node .` to test that it works
- Add it as a service `nano /etc/systemd/system/pdns.service`

```
[Unit]
Description=Proxy Server

[Service]
Type=simple
WorkingDirectory=YOUR DIRECTORY
ExecStart=node .
Restart=always
```

- Run: `service pdns start`
