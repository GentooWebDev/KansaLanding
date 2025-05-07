#!/bin/bash
deno run --watch=./vento,./assets,./.buildscripts --deny-env=SASS_PATH --allow-read=. --allow-write=./serve ./.buildscripts/build.ts .