#!/bin/bash

apt update
apt install -y cron
crontab /etc/startup/cronfile