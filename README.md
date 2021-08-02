<p align="center">
  <a href="" rel="noopener">
 <img width=200px height=250px src=".github/docs/ansible.png" alt="Ansible Linux Hardening Project"></a>
</p>

<h3 align="center">Backuply</h3>

<div align="center">

[![Status](https://img.shields.io/badge/status-active-success.svg)](https://sykesdev.ca/projects/)
[![CI](https://github.com/SystemFiles/backuply/actions/workflows/ci.yml/badge.svg)](https://github.com/SystemFiles/backuply/actions/workflows/ci.yml)
[![CD](https://github.com/SystemFiles/backuply/actions/workflows/cd.yml/badge.svg)](https://github.com/SystemFiles/backuply/actions/workflows/cd.yml)
[![GitHub Issues](https://img.shields.io/github/issues/systemfiles/backuply.svg)](https://github.com/SystemFiles/backuply/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/systemfiles/backuply.svg)](https://github.com/SystemFiles/backuply/issues)
[![License](https://img.shields.io/badge/license-Apache2.0-blue.svg)](/LICENSE)

</div>

---

<p align="center"> A Simple backup client with an emphasis on ease-of-use
    <br> 
</p>

## 🧐 About <a name = "about"></a>

Simple backup client written in NodeJS with an emphasis on ease-of-use. Has the ability to create both full backups and then differential backups to save space and time.

## 💾 Installation

Install Backuply using NPM

```bash
npm i -g backuply
```

## 👷‍♂️ Usage

Using backuply is simple by design. Simply start with the operation (backup, restore, or config) and specify any options to apply.

```
Usage: backuply <command> [options...]

Commands:
  backuply config   configure backuply
  backuply backup   performs a custom backup of a select directory(s)
  backuply restore  perform a restore from a target backup

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

Most functionality such as backup type is automatically determined based on how you are creating the backup. Backup options shown below

```
backuply backup

Descrtiption: Performs a custom backup of a select directory(s)

Positionals:
  name    the name for this backup                                      [string]
  source  the source directory to use for the backup. This is the directory that
          will be at the root of your backup                            [string]
  dest    the destination path which will contain the backup.           [string]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
  --ref      a reference id or name for the full backup used in generating a dif
             ferential backup based on the reference.                   [string]
Examples:
  # Will create a full backup of the source directory
  - backuply backup <name> <source_path> <destination_path>
  # Will create a differential backup when recognizing referenced full backup
  - backuply backup <name> <source_path> <destination_path> --ref <name/uuid>
```

Restoring from an existing backup could not be easier.

```
backuply restore

Description: Perform a restore from a target backup

Positionals:
  ref   the full uuid or name for the backup to restore                 [string]
  dest  path to destination restore directory                           [string]

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

### ⚙️ App Configuration

Making changes to any app configuration can be done in a single one-line command which is capable of modifying multiple attributes at a time. See below for usage details and some examples

```
backuply config

Description: Configure backuply

Options:
  --help       Show help                                               [boolean]
  --version    Show version number                                     [boolean]
  --db.path    Configure the path to the local database used to store backup 
               metadata                                                 [string]
  --log.level  Configure the logging level                              [string]

Examples:
  # Enable debug logging
  - backuply config --log.level DEBUG
  # Change local db path
  - backuply config --db.path ~/Documents/backuply/db.json
```

Future iterations with more config options will follow the same format and will also be documented in the `config --help` subcommand.

## 🧩 Contributing

If you would like to contribute an idea, feature request, or bugfix please start by creating an [issue](https://github.com/SystemFiles/backuply/issues)

## 👷‍♂️ Authors <a name = "authors" >

- [Ben Sykes (SystemFiles)](https://sykesdev.ca/)