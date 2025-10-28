# commit-date-changer

An interactive CLI tool for safely changing Git commit dates with built-in validation and multi-language support.

## Features

- 🔒 **Safe by default** - Works with unpushed commits by default
- 💻 **Two modes** - Interactive UI or CLI mode for automation
- ⚠️ **Safety warnings** - Multiple protection layers when working with pushed commits
- ✅ **Smart validation** - Automatic chronological order checking
- 🎨 **Interactive UI** - User-friendly interface with colored output
- 🌍 **Multilingual** - Support for English and Russian
- 🔄 **Batch processing** - Change multiple commits in one session
- 📅 **ISO format** - Simple and unambiguous date format (YYYY-MM-DDTHH:mm)
- 📊 **JSON output** - Structured output for automation and scripting

## Installation

```bash
npm install -g commit-date-changer
```

Or locally in your project:

```bash
npm install --save-dev commit-date-changer
```

## Usage

### Interactive Mode (Default)

Simply run the command and follow the prompts:

```bash
commit-date
```

The tool will:

1. Show you a list of commits (unpushed only by default)
2. Let you select a commit to modify
3. Show the current date and valid date range
4. Ask for a new date with validation
5. Preview changes before applying
6. Allow you to modify more commits in the same session

**Options for interactive mode:**

```bash
commit-date --count 20              # Show more commits (default: 10)
commit-date --allow-pushed          # Include pushed commits (⚠️ dangerous)
```

### CLI Mode (For Automation)

Change commit dates directly from the command line:

```bash
# Basic usage
commit-date --hash abc1234 --date "2025-10-28T18:30"

# With JSON output for scripts
commit-date --hash abc1234 --date "2025-10-28T18:30" --json

# Modify pushed commit and skip confirmation
commit-date --hash abc1234 --date "2025-10-28T18:30" --allow-pushed --no-confirm
```

**CLI flags:**

- `--hash <hash>` - Short or full commit hash
- `--date <iso-date>` - New date in ISO 8601 format (YYYY-MM-DDTHH:mm or full ISO string)
- `--allow-pushed` - Allow working with pushed commits (⚠️ dangerous)
- `--no-confirm` - Skip confirmations for pushed commits
- `--json` - Output result in JSON format

**JSON output example:**

```json
{
  "success": true,
  "commit": {
    "hash": "abc1234",
    "message": "Add user authentication",
    "oldDate": "2024-01-01T10:30:00",
    "newDate": "2024-01-01T08:00:00"
  }
}
```

### Other Options

```bash
commit-date --help                  # Show help
commit-date --version               # Show version
```

## Example: Interactive Mode

```
🔍 Found 3 commits

  1. a1b2c3d (2024-01-01 10:30) Add user authentication
  2. d4e5f6g (2024-01-01 14:20) Fix login bug
  3. g7h8i9j (2024-01-02 09:15) Update README

? Select commit to change date: 1

✓ Selected commit: a1b2c3d

📅 Current date: 2024-01-01T10:30:00
   Valid range: no limit — 2024-01-01T14:19:59

? Enter new date and time (ISO format: YYYY-MM-DDTHH:mm): 2024-01-01T08:00

✓ New date: 2024-01-01T08:00:00

📋 Preview of changes:
   Commit:       a1b2c3d "Add user authentication"
   Old date:     2024-01-01T10:30:00
   New date:     2024-01-01T08:00:00
   Changing:     Author Date + Committer Date

? Apply changes? (Y/n) y

✨ Commit date successfully changed!

? Change another commit? (y/N) n

👋 Done!
```

## Example: CLI Mode

```bash
# Change a local commit
$ commit-date --hash a1b2c3d --date "2024-01-01T08:00"
✨ Commit date successfully changed!

# Get JSON output
$ commit-date --hash a1b2c3d --date "2024-01-01T08:00" --json
{"success":true,"commit":{"hash":"a1b2c3d","message":"Add user authentication","oldDate":"2024-01-01T10:30:00","newDate":"2024-01-01T08:00:00"}}

# Change pushed commit (dangerous!)
$ commit-date --hash d4e5f6g --date "2024-01-01T15:00" --allow-pushed --no-confirm
✨ Commit date successfully changed!
⚠️  This commit was pushed. You need to force push: git push --force-with-lease
```

## Requirements

- Node.js >= 18.0.0
- Git repository
- Clean working tree (no uncommitted changes)

## Safety

### Safe Mode (Default)

By default, the tool:

- Works only with unpushed commits
- Doesn't require force push
- Is safe for team collaboration

### --allow-pushed Mode (⚠️ Dangerous!)

Use only if:

- ✅ You're working in a personal branch
- ✅ Nobody else is using this branch
- ✅ You understand the consequences of force push

Modifying pushed commits:

- ⚠️ Rewrites Git history
- ⚠️ Requires `git push --force-with-lease`
- ⚠️ Can break other developers' work

**The tool will show multiple warnings and ask for confirmation before proceeding!**

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Format code
npm run format
```

## License

MIT

## Author

Timur Arbaev
