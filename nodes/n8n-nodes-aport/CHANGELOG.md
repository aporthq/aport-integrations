# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-10-29

### Added

- Initial release of n8n-nodes-aport
- Support for Verify Policy operation
- Support for Create Passport operation
- Support for Get Passport operation
- Support for Suspend Passport operation
- Support for List Policy Packs operation
- Comprehensive error handling with continueOnFail support
- Full documentation and examples
- APort API credentials integration
- Live tested in n8n environment

### Known Issues

- Newly created passports require indexing time before verification (API limitation)
- Get Passport operation may return 403 for recently created agents (API limitation)
- Suspend Passport may return 405 depending on API permissions
