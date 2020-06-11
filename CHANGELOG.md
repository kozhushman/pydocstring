# Change Log

All notable changes to the "python-docstring" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.4] - 04.05.2020
### Fixed
- Bug that causes command not working

## [0.0.5] - 04.05.2020
### Fixed
- Removed hello world message

## [0.0.6] - 06.05.2020
### Added
- Attributes block for classes

## [0.0.7] - 13.05.2020
### Fixed
- Wrong generate while declaration on multiple lines

### Added
 - Multiline declaration support (cursor must be on the first line)
 - Support of __init__ args for class declaration

## [0.0.8] - 15.05.2020
### Fixed
 - removed 'self' from class args

## [0.1.0] - 11.06.2020
### Fixed
- Issue #4 (Trailing comma in argument list treated as (undefined) argument)
- Issue #5 (Subscriptable types split incorrectly)

### Added
- Parsing attributes inside __init__ and adding them to class declaration
