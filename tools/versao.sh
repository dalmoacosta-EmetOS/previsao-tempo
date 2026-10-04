#!/usr/bin/env bash
# Uso: tools/versao.sh 1.7.1
# Carimba a versão em TODOS os imports (?v=...), no index.html e no rodapé,
# para o navegador nunca misturar arquivo novo com arquivo antigo do cache (ADR-016).
set -euo pipefail
V="$1"
cd "$(dirname "$0")/.."
sed -i -E "s/export const VERSION = '[^']+';/export const VERSION = '${V}';/" js/app.js
sed -i -E "s/\?v=[0-9.]+\"/?v=${V}\"/g" index.html
find js -name '*.js' -print0 | xargs -0 sed -i -E "s#(from '\.{1,2}/[^'?]+\.js)(\?v=[0-9.]+)?'#\1?v=${V}'#g"
sed -i -E "s#('vendor/[^'?]+\.js)\?v=[0-9.]+'#\1?v=${V}'#g" js/account.js  # biblioteca carregada sob demanda
sed -i -E "s/^const VERSION = '[^']+';/const VERSION = '${V}';/" sw.js
echo "Versão ${V} carimbada:"; grep -rhoE "\?v=[0-9.]+" index.html js | sort | uniq -c
