---
name: dns
description: Manage Spaceship DNS records for scrappr.io
allowed-tools: Bash(aws *), Bash(curl *)
---

# Manage DNS Records

Manage DNS records for `scrappr.io` via the Spaceship REST API. Credentials are stored in AWS SSM Parameter Store.

## Setup (one-time)

Store the Spaceship API key and secret in SSM:

```bash
aws ssm put-parameter --name /scrappr/spaceship/api-key --value "YOUR_KEY" --type SecureString --profile scrappr
aws ssm put-parameter --name /scrappr/spaceship/api-secret --value "YOUR_SECRET" --type SecureString --profile scrappr
```

## How it works

1. Fetch credentials from SSM Parameter Store:

```bash
API_KEY=$(aws ssm get-parameter --name /scrappr/spaceship/api-key --with-decryption --query Parameter.Value --output text --profile scrappr)
API_SECRET=$(aws ssm get-parameter --name /scrappr/spaceship/api-secret --with-decryption --query Parameter.Value --output text --profile scrappr)
```

2. Determine what the user wants to do and execute the appropriate Spaceship API call.

### List records

```bash
curl -s -X GET "https://spaceship.dev/api/v1/dns/records/scrappr.io?take=100&skip=0" \
  -H "X-Api-Key: $API_KEY" \
  -H "X-Api-Secret: $API_SECRET" \
  -H "Accept: application/json"
```

Display results in a readable table format.

### Create or update records

```bash
curl -s -X PUT "https://spaceship.dev/api/v1/dns/records/scrappr.io" \
  -H "X-Api-Key: $API_KEY" \
  -H "X-Api-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"force": true, "items": [{"type": "A", "name": "@", "address": "1.2.3.4", "ttl": 3600}]}'
```

### Delete records

```bash
curl -s -X DELETE "https://spaceship.dev/api/v1/dns/records/scrappr.io" \
  -H "X-Api-Key: $API_KEY" \
  -H "X-Api-Secret: $API_SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"type": "A", "name": "@", "address": "1.2.3.4"}]'
```

## Supported record types

| Type  | Key fields                          |
|-------|-------------------------------------|
| A     | `address` (IPv4)                    |
| AAAA  | `address` (IPv6)                    |
| CNAME | `cname`                             |
| MX    | `exchange`, `preference`            |
| TXT   | `value`                             |
| NS    | `nameserver`                        |
| CAA   | `flag`, `tag`, `value`              |
| SRV   | `service`, `protocol`, `priority`, `weight`, `port`, `target` |
| ALIAS | `aliasName`                         |

## Rules

- Always fetch credentials from SSM at the start — never hardcode or cache them.
- Always use `--profile scrappr` for AWS CLI calls.
- Default TTL is 3600 unless the user specifies otherwise.
- Before creating or deleting records, list current records first and confirm the change with the user.
- Default domain is `scrappr.io`. If the user specifies a different domain, use that instead.
- Display API errors clearly — common ones are 401 (bad credentials), 404 (domain not found), 429 (rate limited).
