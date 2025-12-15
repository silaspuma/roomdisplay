#!/bin/bash

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Creating .env file from template..."
  cp .env.example .env
  echo "Please edit .env with your configuration"
  exit 1
fi

npm start
