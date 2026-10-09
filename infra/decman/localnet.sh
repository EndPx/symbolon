#!/usr/bin/env bash
# Official BitSafe sandbox with isolated names and loopback-only host ports.
# This is LocalNet even though the upstream DecMan network enum says devnet.
set -euo pipefail

control_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="${BITSAFE_LOCALNET_HOME:-/opt/symbolon/decman-source}"
pinned_source=21ffdedf64366b1f2824301c434b427bf4726663
action="${1:-status}"
case "$action" in up|seed|status|stop) ;; *) echo 'Usage: localnet.sh up|seed|status|stop' >&2; exit 2;; esac

if [[ ! -d "$source_dir/.git" ]]; then
  [[ "$action" == up ]] || { echo 'Start with localnet.sh up.' >&2; exit 1; }
  [[ ! -e "$source_dir" ]] || { echo 'Existing source directory is not a Git checkout.' >&2; exit 1; }
  git clone --no-checkout --depth 1 --branch hackathon https://github.com/DLC-link/decentralization-manager.git "$source_dir"
  git -C "$source_dir" fetch --depth 1 origin "$pinned_source"
  git -C "$source_dir" checkout --detach "$pinned_source"
fi
[[ "$(git -C "$source_dir" rev-parse HEAD)" == "$pinned_source" ]] || { echo 'BitSafe source differs from the tested pin.' >&2; exit 1; }

export DOCKER_NETWORK=symbolon-localnet
export COMPOSE_PROJECT_NAME=symbolon-localnet
export PARTY_PREFIX=symbolon-oracle-localnet
# The Splice validator hint must keep exactly three hyphen-separated parts.
# Its default derives from DOCKER_NETWORK, which has an extra hyphen here.
export PARTY_HINT=symbolon-localparty-1
# Reuse upstream health, peer, token and state helpers without modifying them.
source "$source_dir/hackathon/lib.sh"
DECMAN_PROJECT=symbolon-decman-localnet

localnet_compose() {
  export IMAGE_TAG="$LOCALNET_VERSION"
  docker compose -p symbolon-localnet \
    --env-file "$LOCALNET_DIR/compose.env" --env-file "$LOCALNET_DIR/env/common.env" \
    -f "$LOCALNET_DIR/compose.yaml" -f "$LOCALNET_DIR/resource-constraints.yaml" \
    -f "$control_dir/localnet.ports.yaml" \
    --profile sv --profile app-provider --profile app-user "$@"
}
decman_compose() {
  docker compose -p "$DECMAN_PROJECT" -f "$source_dir/hackathon/docker-compose.yml" \
    -f "$control_dir/localnet.decman.yaml" "$@"
}
configure_mesh() {
  if peers_connected; then info 'Existing Symbolon peer mesh is connected'; return; fi
  local peers='[]' idx key pid
  for idx in 1 2 3; do
    key="$(dm_get "$(http_port "$idx")" /keys/status | jq -er '.public_key')"
    pid="$(dm_get "$(http_port "$idx")" /node-config | jq -er '.node.participant_id')"
    peers="$(jq --arg pid "$pid" --arg address "$(node_name "$idx")" --arg key "$key" \
      --argjson port "$(noise_port "$idx")" \
      '. + [{participant_id:$pid,name:$address,address:$address,port:$port,public_key:$key,party:null}]' <<< "$peers")"
  done
  for idx in 1 2 3; do dm_post "$(http_port "$idx")" /network-config "$peers" >/dev/null; done
  for ((attempt=0;attempt<45;attempt++)); do
    if peers_connected; then info 'All three DecMan services are connected'; return; fi
    sleep 2
  done
  die 'Peer mesh did not converge; inspect this stack before retrying.'
}

require_tools
compose_version="$(docker compose version --short | sed 's/^v//')"
printf '2.24.4\n%s\n' "$compose_version" | sort -CV || die 'Docker Compose 2.24.4+ is required for private port overrides.'

case "$action" in
  up)
    check_docker_resources
    free_kb="$(df -Pk "$source_dir" | awk 'NR==2 {print $4}')"
    (( free_kb >= 20 * 1024 * 1024 )) || die 'At least 20 GB free disk is required.'
    if [[ -z "$(decman_compose ps -q 2>/dev/null)" ]]; then
      used="$(ports_in_use 8081 8082 8083)"
      [[ -z "$used" ]] || die "Reserved DecMan ports already in use:$used"
    fi
    if [[ -z "$(localnet_compose ps -q 2>/dev/null)" ]]; then
      used="$(ports_in_use 13901 13902 3975 2901 2902 2975 4901 4902 4975)"
      [[ -z "$used" ]] || die "Reserved participant ports already in use:$used"
    fi
    download_localnet
    # Verify that every sandbox host binding is loopback before starting it.
    localnet_compose config --format json | jq -e \
      '[.services.canton.ports[] | .host_ip == "127.0.0.1"] | all' >/dev/null
    docker pull --platform linux/amd64 "$DECMAN_IMAGE"
    localnet_compose up -d --wait canton splice postgres
    decman_compose up -d
    wait_for_all_nodes
    configure_mesh
    printf '\nLocalNet ready. Next: %s seed\n' "$0"
    ;;
  seed)
    # The upstream seed only uses the loopback APIs and persistent .state.
    bash "$source_dir/hackathon/seed.sh"
    ;;
  status)
    localnet_compose ps
    decman_compose ps
    for idx in 1 2 3; do
      dm_get "$(http_port "$idx")" /healthz | jq .
      dm_get "$(http_port "$idx")" /participants-status | jq .
    done
    ;;
  stop)
    decman_compose stop
    localnet_compose stop
    ;;
esac
