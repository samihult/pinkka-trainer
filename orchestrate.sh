#!/usr/bin/env bash

export $(cat orchestrator/.env | xargs)
node orchestrator/run-task.mjs