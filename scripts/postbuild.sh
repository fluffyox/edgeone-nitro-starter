#!/bin/sh
# Copy @edgeone/pages-blob to build output as external module
# so EdgeOne platform can inject deployCredential into the original SDK
mkdir -p .edgeone/cloud-functions/ssr-node/node_modules/@edgeone
cp -r node_modules/@edgeone/pages-blob .edgeone/cloud-functions/ssr-node/node_modules/@edgeone/pages-blob
echo "[postbuild] Copied @edgeone/pages-blob to build output"
