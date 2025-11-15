#!/usr/bin/env bash
set -euo pipefail

read -rp "Enter project name: " project_name

if [[ -z "${project_name}" ]]; then
  echo "Project name cannot be empty." >&2
  exit 1
fi

fastify generate "${project_name}" --lang=ts
cd "${project_name}"
npm install fastify-sqlite-typed
npm install fastify-rabbitmq
