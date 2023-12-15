#!/bin/sh

dataDir=$(pwd)/data
echo $dataDir

docker run -it --rm \
  --name finality-watcher \
  -v $dataDir:/app/data \
  finality-watcher
