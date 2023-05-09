cp /media/usb0/openwell.zip /tmp/openwell.zip $val >/dev/null 2>&1
rm -rf /var/www/enhanced/content/www/assets/content >/dev/null 2>&1
unzip -o /tmp/openwell.zip -d /var/www/enhanced/content/www/assets/ 
chown -R www-data.www-data /var/www/enhanced/content/www/assets/content >/dev/null 2>&1  
chmod -R 777 /var/www/enhanced/content/www/assets/content >/dev/null 2>&1  
rm /tmp/openwell.zip >/dev/null 2>&1  