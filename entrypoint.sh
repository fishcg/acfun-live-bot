#!/bin/sh

if [ "$1" != 'client' -a "$1" != 'server' ]; then
   echo "sorry, '$1' is not a command"
   exit 1
fi

exec node $1
