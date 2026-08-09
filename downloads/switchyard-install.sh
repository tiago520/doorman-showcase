#!/usr/bin/env bash
# Switchyard endpoint agent installer (showcase build).
# The production installer detects macOS/Linux, fetches the signed app bundle,
# installs the local interceptor + CA, and opens the tray app to claim this
# machine for your yard.
set -euo pipefail
echo "Switchyard installer (sample environment)"
echo "In production this fetches the signed macOS app and enrolls this device."
echo "Explore the rollout flow in the console: Fleet → Rollout."
