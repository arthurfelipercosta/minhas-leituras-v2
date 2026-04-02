#!/usr/bin/env bash
if [ -n "$GOOGLE_SERVICES_JSON" ]; then
    echo "$GOOGLE_SERVICES_JSON" > google-services.json
    echo "google-services.json criado com sucesso"
fi