# GitHub Copilot Actions Setup Steps for MongoDB

This directory contains configuration files to resolve GitHub Copilot firewall blocking issues when running tests that use `@shelf/jest-mongodb`.

## Problem

When GitHub Copilot runs in its environment, firewall rules block access to external domains including `fastdl.mongodb.org`. This causes test failures when `mongodb-memory-server` (used by `@shelf/jest-mongodb`) tries to download MongoDB binaries during test execution.

The error typically looks like:

```
getaddrinfo ENOTFOUND fastdl.mongodb.org
DownloadError: Download failed for url "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-6.0.14.tgz"
```

## Solution

The `actions-setup-steps.yml` file configures setup steps that run **before** the firewall restrictions are applied. These steps:

1. Pre-download the required MongoDB binaries from `fastdl.mongodb.org`
2. Cache the binaries for future use
3. Set environment variables to tell `mongodb-memory-server` to use the cached binaries instead of downloading

## Files

- **`actions-setup-steps.yml`** - Main configuration file for GitHub Copilot Actions setup steps
- **`setup-mongodb.sh`** - Standalone script to test the MongoDB setup process
- **`mongodb-setup.test.js`** - Test file to verify the setup works correctly
- **`README.md`** - This documentation file

## How It Works

### 1. Pre-download Phase (Before Firewall)

The setup steps run before firewall restrictions and:

- Download MongoDB 6.0.14 binary for Ubuntu 22.04 from `fastdl.mongodb.org`
- Extract the binary to `~/.cache/mongodb-binaries/`
- Cache the binaries using GitHub Actions cache

### 2. Environment Configuration

Set environment variables that `mongodb-memory-server` respects:

- `MONGOMS_DOWNLOAD_DIR` - Points to the cached binary directory
- `MONGOMS_DISABLE_DOWNLOAD` - Prevents attempts to download during tests
- `MONGOMS_BINARY_PATH` - Direct path to the mongod binary

### 3. Test Execution (After Firewall)

When tests run:

- `mongodb-memory-server` uses the pre-downloaded cached binaries
- No network requests to `fastdl.mongodb.org` are needed
- Tests pass without firewall blocking issues

## Testing the Setup

To test this setup manually:

```bash
# Run the setup script
./.github/copilot/setup-mongodb.sh

# Run the verification test
npx jest .github/copilot/mongodb-setup.test.js
```

## MongoDB Version Compatibility

This configuration is specifically set up for:

- **MongoDB Version**: 6.0.14
- **Platform**: Ubuntu 22.04 (ubuntu2204)
- **Architecture**: x86_64

If your project needs a different MongoDB version, update the version numbers in:

- `actions-setup-steps.yml` (download URL and paths)
- `setup-mongodb.sh` (download URL and paths)

## Environment Variables Reference

| Variable                   | Purpose                             | Example Value                                                                 |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `MONGOMS_DOWNLOAD_DIR`     | Directory where binaries are cached | `~/.cache/mongodb-binaries`                                                   |
| `MONGOMS_DISABLE_DOWNLOAD` | Prevent download attempts           | `true`                                                                        |
| `MONGOMS_BINARY_PATH`      | Direct path to mongod binary        | `~/.cache/mongodb-binaries/mongodb-linux-x86_64-ubuntu2204-6.0.14/bin/mongod` |

## Related Configuration

The main project's `jest-mongodb-config.js` has been updated to respect the `MONGOMS_DOWNLOAD_DIR` environment variable for compatibility with this setup.

## References

- [GitHub Copilot Actions Setup Steps Documentation](https://gh.io/copilot/actions-setup-steps)
- [mongodb-memory-server Documentation](https://github.com/nodkz/mongodb-memory-server)
- [@shelf/jest-mongodb Documentation](https://github.com/shelfio/jest-mongodb)
