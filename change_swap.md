# 1. Check your RAM size (in GiB)
free -h

# 2. Turn off existing swap
sudo swapoff -a

# 3. Remove the old swap file
sudo rm /swapfile

# 4. Create a new swap file sized to your RAM
#    Example for 16 GiB RAM, adjust accordingly:
sudo dd if=/dev/zero of=/swapfile bs=1M count=16384

# 5. Set correct permissions
sudo chmod 600 /swapfile

# 6. Format as swap
sudo mkswap /swapfile

# 7. Enable it
sudo swapon /swapfile

# 8. Make it persistent in /etc/fstab (usually already there)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab   


# Get the UUID of your root filesystem
ROOT_UUID=$(findmnt -n -o UUID /)
# Get the offset
OFFSET=$(sudo filefrag -v /swapfile | awk 'NR==4{gsub(/\./,"");print $4}')

# Edit /etc/default/grub and set:
# GRUB_CMDLINE_LINUX_DEFAULT="resume=UUID=$ROOT_UUID resume_offset=$OFFSET"

sudo update-grub
sudo update-initramfs -u   


Then test with sudo systemctl hibernate. 