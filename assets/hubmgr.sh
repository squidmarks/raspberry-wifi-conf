#!/bin/bash
date >> log
/usr/bin/wget -q -t 5 -O /dev/null https://api.nasa.gov/planetary/apod?api_key=NNKOjkoul8n1CH18TWA9gwngW1s1SmjESPjNoUFo
rc=$?;
if [[ $rc != 0 ]]; then
  echo not connected. starting soft ap
  cd raspberry-wifi-conf
  sudo /usr/bin/node server.js &
fi
