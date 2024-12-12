#!/bin/bash

sudo cp /home/pi/owlidays2024/units/owlidays2024.service /lib/systemd/user/
sudo systemctl daemon-reload
systemctl --user enable owlidays2024.service 