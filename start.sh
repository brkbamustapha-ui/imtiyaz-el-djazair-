#!/usr/bin/env bash
#
# Imtiyaz El Djazair — one-command local start.
#
# Checks everything the site needs, fixes what it can, then starts the dev
# server on the first free port and prints the URL to open.
#
#   bash start.sh
#
# Safe to re-run. It never overwrites a value you have already set.

set -u

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$OFF" "$1"; }
fail() { printf '  %s✗%s %s\n' "$RED" "$OFF" "$1"; }
step() { printf '\n%s%s%s\n' "$BOLD" "$1" "$OFF"; }

cd "$(dirname "$0")" || exit 1

# ---------------------------------------------------------------- 1. Node/npm
step "1. Node.js and npm"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  fail "Node.js and npm are not installed (or not on your PATH)."
  echo
  echo "  Install Node.js LTS (v20 or newer), then run this script again:"
  echo
  case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin)
      echo "    macOS — with Homebrew:   brew install node"
      echo "            without Homebrew: https://nodejs.org/en/download  (macOS Installer .pkg)" ;;
    Linux)
      echo "    Debian/Ubuntu:  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
      echo "                    sudo apt-get install -y nodejs"
      echo "    Fedora/RHEL:    sudo dnf install -y nodejs"
      echo "    Arch:           sudo pacman -S nodejs npm" ;;
    *)
      echo "    Windows:  https://nodejs.org/en/download  (Windows Installer .msi)"
      echo "              Then reopen your terminal so PATH picks it up." ;;
  esac
  echo
  echo "  Any OS — winget/choco/nvm also work:"
  echo "    winget install OpenJS.NodeJS.LTS"
  echo "    nvm install --lts && nvm use --lts"
  exit 1
fi

NODE_V="$(node -v)"
NODE_MAJOR="$(printf '%s' "$NODE_V" | sed 's/^v\([0-9]*\).*/\1/')"
ok "node $NODE_V   ($(command -v node))"
ok "npm v$(npm -v)   ($(command -v npm))"

if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
  fail "Node $NODE_V is too old — this project needs v20 or newer."
  echo "  Upgrade with:  nvm install --lts && nvm use --lts"
  exit 1
fi

# --------------------------------------------------------------- 2. Packages
step "2. Dependencies"
if [ ! -d node_modules ] || [ ! -d node_modules/next ]; then
  warn "node_modules missing — running npm install (this takes a minute)…"
  npm install || { fail "npm install failed. Read the error above."; exit 1; }
fi
ok "dependencies installed"

# ---------------------------------------------------- 3. package.json scripts
step "3. Start command"
DEV_SCRIPT="$(node -p "try{require('./package.json').scripts.dev||''}catch(e){''}")"
if [ -z "$DEV_SCRIPT" ]; then
  fail "package.json has no \"dev\" script."
  exit 1
fi
ok "npm run dev  ->  $DEV_SCRIPT"

# ------------------------------------------------------------ 4. .env values
step "4. Environment variables"

if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then fail ".env.example is missing — is this the right folder?"; exit 1; fi
  cp .env.example .env
  ok ".env created from .env.example"
fi

# read a KEY=value from .env, stripping surrounding quotes
envval() { grep -E "^$1=" .env 2>/dev/null | head -1 | sed "s/^$1=//" | sed 's/^["'"'"']//;s/["'"'"']$//'; }
# replace, or append, KEY="value" in .env without printing the value
envset() {
  node -e '
    const fs=require("fs"), [k,v]=[process.argv[1],process.argv[2]];
    let s=fs.readFileSync(".env","utf8");
    const line=k+"="+JSON.stringify(v);
    const re=new RegExp("^"+k+"=.*$","m");
    s = re.test(s) ? s.replace(re,line) : s.replace(/\n*$/,"\n")+line+"\n";
    fs.writeFileSync(".env",s);
  ' "$1" "$2"
}

# DATABASE_URL — required, has a working default
if [ -z "$(envval DATABASE_URL)" ]; then
  envset DATABASE_URL "file:./dev.db"
  ok "DATABASE_URL set to the default local SQLite file"
else
  ok "DATABASE_URL is set"
fi

# AUTH_SECRET — must be long and must not be the shipped placeholder
AUTH_NOW="$(envval AUTH_SECRET)"
case "$AUTH_NOW" in
  ""|change-me*|*generate-a-long-random-string*)
    envset AUTH_SECRET "$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64url"))')"
    ok "AUTH_SECRET generated (64 random characters, not shown)"
    ;;
  *)
    if [ "${#AUTH_NOW}" -lt 32 ]; then
      envset AUTH_SECRET "$(node -e 'console.log(require("crypto").randomBytes(48).toString("base64url"))')"
      ok "AUTH_SECRET was too short — regenerated (not shown)"
    else
      ok "AUTH_SECRET is set (${#AUTH_NOW} characters, not shown)"
    fi
    ;;
esac

# ADMIN_PASSWORD — only needed until the first login. Asked for, never printed.
NEED_SEED=0
[ ! -f prisma/dev.db ] && NEED_SEED=1

if [ -z "$(envval ADMIN_PASSWORD)" ] && [ "$NEED_SEED" = "1" ]; then
  echo
  echo "  The first owner account has to be created. Choose its password now."
  echo "  ${DIM}It is hashed before it is stored, never shown, never logged.${OFF}"
  echo "  ${DIM}You will be asked to change it at first login.${OFF}"
  PW=""; PW2=""
  while [ -z "$PW" ] || [ "$PW" != "$PW2" ]; do
    printf '  Password (min 10 chars, hidden): '; stty -echo 2>/dev/null; read -r PW; stty echo 2>/dev/null; echo
    if [ "${#PW}" -lt 10 ]; then echo "  ${RED}Too short — 10 characters minimum.${OFF}"; PW=""; continue; fi
    printf '  Confirm:                         '; stty -echo 2>/dev/null; read -r PW2; stty echo 2>/dev/null; echo
    [ "$PW" != "$PW2" ] && echo "  ${RED}They do not match. Again.${OFF}"
  done
  envset ADMIN_PASSWORD "$PW"
  PW=""; PW2=""
  ok "ADMIN_PASSWORD saved to .env (not shown)"
elif [ -n "$(envval ADMIN_PASSWORD)" ]; then
  ok "ADMIN_PASSWORD is set (not shown)"
else
  ok "ADMIN_PASSWORD is empty — fine, the owner account already exists"
fi

# ------------------------------------------------------------ 5. Database
step "5. Database"
if [ "$NEED_SEED" = "1" ]; then
  warn "no database yet — creating and seeding it…"
  npm run setup || { fail "npm run setup failed. Read the error above."; exit 1; }
else
  ok "database already exists (prisma/dev.db)"
  npx prisma generate >/dev/null 2>&1 && ok "Prisma client generated"
fi

# ------------------------------------------------------------ 6. Free port
step "6. Port"
PORT="$(node -e '
  const net=require("net");
  const wanted=[3000,3001,3002,3003,5173,4321,8080];
  (async()=>{
    for (const p of wanted) {
      const free = await new Promise(res=>{
        const s=net.createServer();
        s.once("error",()=>res(false));
        s.once("listening",()=>s.close(()=>res(true)));
        s.listen(p,"127.0.0.1");
      });
      if (free) { console.log(p); return; }
    }
    console.log("");   // nothing free in the list
  })();
')"

if [ -z "$PORT" ]; then
  fail "Ports 3000, 3001, 3002, 3003, 5173, 4321 and 8080 are all busy."
  echo "  Free one up, or start manually:  npm run dev -- -p 9000"
  exit 1
fi

if [ "$PORT" != "3000" ]; then
  warn "port 3000 is already used by another program — using $PORT instead"
  # Show what holds 3000, when the tools for it exist.
  if command -v lsof >/dev/null 2>&1; then
    HOLDER="$(lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null | tail -n +2 | head -3)"
    [ -n "$HOLDER" ] && printf '    %sheld by:%s\n%s\n' "$DIM" "$OFF" "$(printf '%s' "$HOLDER" | sed 's/^/      /')"
  fi
else
  ok "port 3000 is free"
fi

# ------------------------------------------------------------ 7. Start it
step "7. Starting the development server"
echo
printf '  %sOpen this in your browser:%s\n\n' "$BOLD" "$OFF"
printf '      %shttp://localhost:%s%s\n' "$GREEN$BOLD" "$PORT" "$OFF"
printf '      %shttp://localhost:%s/admin%s   (dashboard)\n\n' "$GREEN" "$PORT" "$OFF"
printf '  %sStop the server with Ctrl+C. Leave this window open while you browse.%s\n\n' "$DIM" "$OFF"

exec npm run dev -- -p "$PORT"
