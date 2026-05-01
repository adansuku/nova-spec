#!/usr/bin/env bash
#
# nova-spec installer — Interactive
# Installs nova-spec into Claude Code or OpenCode.
#
# Usage: bash install.sh [options]
#   -t, --target    claude|opencode|both  Target (prompts if not specified)
#   -p, --path      <path>                Destination directory (default: $PWD)
#       --pick                            Pick destination directory (interactive)
#   -h, --help                            Show help
#
# No options: interactive mode
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TARGET=""
DEST_DIR=""
PICK_DEST=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--target)
      TARGET="$2"
      shift 2
      ;;
    -p|--path)
      DEST_DIR="$2"
      shift 2
      ;;
    --pick)
      PICK_DEST=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -t, --target TARGET   Target: claude|opencode|both"
      echo "  -p, --path PATH       Destination directory (default: current directory)"
      echo "      --pick            Pick destination directory (interactive)"
      echo "  -h, --help            Show this help"
      echo ""
      echo "No options: interactive mode"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Simple directory navigator (no dependencies).
pick_dir_menu() {
  local current="${1:-$HOME}"

  while true; do
    echo ""
    echo -e "${BLUE}📁 Choose destination directory${NC}"
    echo "Current directory: $current"
    echo ""
    echo "Actions:"
    echo "  0) Use this directory"
    echo "  u) Up (..)"
    echo "  q) Cancel"
    echo ""
    echo "Subdirectories:"

    local -a subdirs=()
    local d
    while IFS= read -r d; do
      subdirs+=("$d")
    done < <(find "$current" -maxdepth 1 -mindepth 1 -type d -print 2>/dev/null | sort | head -n 30)

    local i=1
    for d in "${subdirs[@]}"; do
      echo "  $i) $(basename "$d")"
      i=$((i + 1))
    done

    echo ""
    echo "Tip: you can also paste a path and press Enter."
    read -r -p "→ " choice

    case "$choice" in
      0)
        echo "$current"
        return 0
        ;;
      u)
        current=$(cd "$current/.." && pwd)
        ;;
      q)
        return 1
        ;;
      /*|~*)
        local expanded="$choice"
        if [[ "$expanded" == "~"* ]]; then
          expanded="${expanded/#\~/$HOME}"
        fi
        if [[ -d "$expanded" ]]; then
          current=$(cd "$expanded" && pwd)
        else
          echo -e "${RED}✗ Does not exist: $expanded${NC}"
        fi
        ;;
      '' )
        ;;
      *)
        if [[ "$choice" =~ ^[0-9]+$ ]]; then
          local idx=$((choice - 1))
          if (( idx >= 0 )) && (( idx < ${#subdirs[@]} )); then
            current=$(cd "${subdirs[$idx]}" && pwd)
          else
            echo -e "${RED}✗ Invalid option${NC}"
          fi
        else
          echo -e "${RED}✗ Invalid option${NC}"
        fi
        ;;
    esac
  done
}

# Search-based picker (if fzf is installed).
pick_dir_fzf() {
  local start="${1:-$HOME}"
  if ! command -v fzf >/dev/null 2>&1; then
    return 1
  fi

  echo -e "${YELLOW}Searching folders under: $start (may take a few seconds)${NC}" >&2
  find "$start" -maxdepth 5 -type d 2>/dev/null \
    | sed '/\/\.git\//d' \
    | fzf --prompt="Destination> " --height=20 --border
}

resolve_dest_dir() {
  if [[ -n "$DEST_DIR" ]]; then
    DEST_DIR="${DEST_DIR/#\~/$HOME}"
    if [[ ! -d "$DEST_DIR" ]]; then
      mkdir -p "$DEST_DIR"
    fi
    cd "$DEST_DIR"
    return 0
  fi

  if [[ "$PICK_DEST" == true ]]; then
    local picked=""
    if picked=$(pick_dir_fzf "$HOME"); then
      cd "$picked"
      return 0
    fi
    if picked=$(pick_dir_menu "$HOME"); then
      cd "$picked"
      return 0
    fi
    echo "Cancelled."
    exit 0
  fi
}

# Verify we're in the correct repo
if [[ ! -d "$SCRIPT_DIR/novaspec" ]] || [[ ! -f "$SCRIPT_DIR/AGENTS.md" ]]; then
  echo -e "${RED}✗ Cannot find novaspec/ or AGENTS.md in $SCRIPT_DIR${NC}" >&2
  echo "  Run this script from the nova-spec repo." >&2
  exit 1
fi

# Resolve the destination (if --path/--pick).
resolve_dest_dir

# Verify we're NOT inside the nova-spec repo itself
if [[ "$SCRIPT_DIR" == "$PWD" ]]; then
  echo -e "${BLUE}📁 Where do you want to install nova-spec?${NC}"
  echo ""
  echo "Current directory: $PWD"
  echo ""
  echo "Options:"
  echo "  (1) Type path manually (use TAB to autocomplete)"
  echo "  (2) Navigate folders (menu)"
  echo "  (3) Search folder (fzf, if installed)"
  echo "  (4) Cancel"
  echo ""
  read -p "→ " -n 1 choice
  echo ""

  case $choice in
    1)
      echo ""
      echo "Enter the absolute or relative path:"
      read -e DEST_DIR
      if [[ -z "$DEST_DIR" ]]; then
        echo -e "${RED}✗ Empty path${NC}"
        exit 1
      fi
      DEST_DIR="${DEST_DIR/#\~/$HOME}"
      if [[ ! -d "$DEST_DIR" ]]; then
        mkdir -p "$DEST_DIR"
      fi
      cd "$DEST_DIR"
      echo -e "${GREEN}→ Installing in: $(pwd)${NC}"
      ;;
    2)
      if picked=$(pick_dir_menu "$HOME"); then
        cd "$picked"
        echo -e "${GREEN}→ Installing in: $(pwd)${NC}"
      else
        echo "Cancelled."
        exit 0
      fi
      ;;
    3)
      if picked=$(pick_dir_fzf "$HOME"); then
        cd "$picked"
        echo -e "${GREEN}→ Installing in: $(pwd)${NC}"
      else
        echo -e "${RED}✗ fzf is not installed or no folder selected${NC}"
        exit 1
      fi
      ;;
    4)
      echo "Cancelled."
      exit 0
      ;;
    *)
      echo -e "${RED}✗ Invalid option${NC}"
      exit 1
      ;;
  esac
fi

case "$PWD" in
  "$SCRIPT_DIR"/*)
    echo -e "${RED}✗ Do not install inside the nova-spec repo.${NC}" >&2
    echo "  Choose a destination repo outside: $SCRIPT_DIR" >&2
    exit 1
    ;;
esac

#
# Interactive mode if TARGET is not set
#
if [[ -z "$TARGET" ]]; then
  echo -e "${BLUE}🎯 nova-spec installer${NC}"
  echo "─────────────────"
  echo ""
  echo "Target?"
  echo "  (1) Claude Code"
  echo "  (2) OpenCode"
  echo "  (3) Both (Claude + OpenCode)"
  echo ""
  read -p "→ " -n 1 choice
  echo ""

  case $choice in
    1) TARGET="claude" ;;
    2) TARGET="opencode" ;;
    3) TARGET="both" ;;
    *)
      echo -e "${RED}Invalid option: $choice${NC}"
      exit 1
      ;;
  esac

fi

# Add ignore rules idempotently (without overwriting an existing .gitignore).
ensure_gitignore() {
  local file=".gitignore"
  local begin="# nova-spec (local)"
  local end="# /nova-spec"

  if [[ -f "$file" ]] && grep -Fq "$begin" "$file"; then
    return 0
  fi

  cat >> "$file" << 'EOF'

# nova-spec (local)
novaspec/config.yml
.env
notes.md
.opencode/settings.local.json
.opencode/node_modules/
.DS_Store
*.swp
*.swo
# /nova-spec
EOF
}

# Validate TARGET
if [[ "$TARGET" != "claude" ]] && [[ "$TARGET" != "opencode" ]] && [[ "$TARGET" != "both" ]]; then
  echo -e "${RED}✗ Invalid target: $TARGET${NC}" >&2
  echo "  Use: claude, opencode or both"
  exit 1
fi

echo ""
echo -e "${BLUE}→ Installing for $TARGET...${NC}"
echo ""

#
# Common install
#
echo -e "${YELLOW}[1/6] Copying novaspec/${NC}"
DEST_CONFIG_BACKUP=""
if [[ -f novaspec/config.yml ]]; then
  DEST_CONFIG_BACKUP=$(mktemp)
  cp novaspec/config.yml "$DEST_CONFIG_BACKUP"
fi
rm -rf novaspec
cp -R "$SCRIPT_DIR/novaspec" .
rm -f novaspec/config.yml  # never distribute the maintainer's config
if [[ -n "$DEST_CONFIG_BACKUP" ]]; then
  mv "$DEST_CONFIG_BACKUP" novaspec/config.yml
elif [[ -f novaspec/config.example.yml ]]; then
  cp novaspec/config.example.yml novaspec/config.yml
fi

echo -e "${YELLOW}[2/6] Copying AGENTS.md / CLAUDE.md${NC}"
cp "$SCRIPT_DIR/AGENTS.md" ./AGENTS.md
cp "$SCRIPT_DIR/CLAUDE.md" ./CLAUDE.md

echo -e "${YELLOW}[3/6] Creating context/ structure${NC}"
mkdir -p context/{decisions/archived,gotchas,services,changes/{active,archive}}
touch context/changes/active/.gitkeep

if [[ "$TARGET" == "claude" ]] || [[ "$TARGET" == "both" ]]; then
  echo -e "${YELLOW}[4/6] Creating .claude/ symlinks${NC}"
  mkdir -p .claude
  (
    cd .claude
    for name in commands skills agents; do
      [[ -L "$name" ]] && continue
      [[ -d "$name" ]] && rm -rf "$name"
      ln -s "../novaspec/$name" "$name"
    done
  )
fi

if [[ "$TARGET" == "opencode" ]] || [[ "$TARGET" == "both" ]]; then
  echo -e "${YELLOW}[4/6] Creating .opencode/ symlinks${NC}"
  mkdir -p .opencode
  (
    cd .opencode
    for name in commands skills agents; do
      [[ -L "$name" ]] && continue
      [[ -d "$name" ]] && rm -rf "$name"
      ln -s "../novaspec/$name" "$name"
    done
  )

  echo -e "${YELLOW}[5/6] Configuring OpenCode${NC}"
  if [[ ! -f .opencode/settings.local.json ]]; then
    cat > .opencode/settings.local.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "skill": {
      "*": "allow"
    }
  }
}
EOF
  fi
fi

echo -e "${YELLOW}[5/6] Ensuring .gitignore${NC}"
ensure_gitignore

echo -e "${YELLOW}[6/6] Creating notes.md${NC}"
touch notes.md

echo ""
echo -e "${GREEN}✓ nova-spec installed for $TARGET${NC}"
echo ""
echo "Structure created:"
ls -la . | grep -E '^(d|l)' | head -10
echo ""
echo "Next step:"
echo "  Open $TARGET in this directory and try:"
echo "    /nova-start PROJ-123"
