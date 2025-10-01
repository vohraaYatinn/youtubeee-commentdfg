import subprocess
import time
import os

# Function to start OpenVPN connection with a given config file
def start_openvpn(config_path, credentials_file):
    print(f"Attempting to connect using profile: {config_path}")

    # Path to the OpenVPN executable
    openvpn_path = r"C:/Program Files/OpenVPN/bin/openvpn.exe"  # Ensure this path is correct

    # Command to run OpenVPN with the --auth-user-pass flag pointing to the credentials file
    command = [
        openvpn_path,  # Path to OpenVPN executable
        "--config", config_path,  # Path to the config file
        "--auth-user-pass", credentials_file,  # Point to the credentials file
    ]
    
    # Open a subprocess to run OpenVPN
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    # Wait for OpenVPN to finish connecting
    output, errors = process.communicate()
    
    if process.returncode == 0:
        print("VPN connected successfully!")
    else:
        print(f"Error connecting VPN: {errors}")
        print(f"Output: {output}")

# Function to set IP address using netsh (adjust the adapter name if necessary)
# Function to set IP address using netsh (adjust the adapter name if necessary)
def set_ip():
    try:
        # List network interfaces to find the correct TAP interface name
        interface_command = ['netsh', 'interface', 'show', 'interface']
        interfaces = subprocess.check_output(interface_command, text=True)
        print("Available network interfaces:")
        print(interfaces)
        
        # Assume TAP interface name is "OpenVPN TAP-Windows6", adjust if necessary
        tap_interface = "OpenVPN TAP-Windows6"  # Adjusted based on available interfaces
        
        # Check if the TAP interface is connected before attempting to set the IP
        if "Connected" in interfaces and tap_interface in interfaces:
            print("TAP interface is connected. Proceeding to set IP address...")
            # Using quotes around the interface name to avoid issues with spaces
            subprocess.run(
                ['netsh', 'interface', 'ip', 'set', 'address', f'name={tap_interface}', 'static', '10.8.0.4', '255.255.0.0'],
                check=True
            )
            print("IP address set successfully.")
        else:
            print(f"Error: TAP interface '{tap_interface}' is not connected.")
    except subprocess.CalledProcessError as e:
        print(f"Error setting IP address: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

    try:
        # List network interfaces to find the correct TAP interface name
        interface_command = ['netsh', 'interface', 'show', 'interface']
        interfaces = subprocess.check_output(interface_command, text=True)
        print("Available network interfaces:")
        print(interfaces)
        
        # Assume TAP interface name is "OpenVPN TAP-Windows6", adjust if necessary
        tap_interface = "OpenVPN TAP-Windows6"  # Adjusted based on available interfaces
        
        # Check if the TAP interface is connected before attempting to set the IP
        if "Connected" in interfaces and tap_interface in interfaces:
            print("TAP interface is connected. Proceeding to set IP address...")
            subprocess.run(
                ['netsh', 'interface', 'ip', 'set', 'address', f'name="{tap_interface}"', 'static', '10.8.0.4', '255.255.0.0'],
                check=True
            )
            print("IP address set successfully.")
        else:
            print(f"Error: TAP interface '{tap_interface}' is not connected.")
    except subprocess.CalledProcessError as e:
        print(f"Error setting IP address: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


# Function to create a credentials file
def create_credentials_file(username, password):
    credentials_file = 'vpn_credentials.txt'
    with open(credentials_file, 'w') as f:
        f.write(f"{username}\n{password}")
    return credentials_file

# Function to cycle through VPN profiles in the given folder
def cycle_vpn_profiles(vpn_folder, username, password):
    # Create credentials file
    credentials_file = create_credentials_file(username, password)
    
    while True:
        # Get all .ovpn files in the folder
        vpn_files = [f for f in os.listdir(vpn_folder) if f.endswith('.ovpn')]
        
        if not vpn_files:
            print("No VPN profiles found in the specified folder.")
            break
        
        for vpn_file in vpn_files:
            config_path = os.path.join(vpn_folder, vpn_file)
            print(f"Connecting to VPN using profile: {vpn_file}")
            
            try:
                # Step 1: Start the OpenVPN connection with the current profile
                start_openvpn(config_path, credentials_file)

                # Step 2: Wait for OpenVPN to finish connecting (increase delay if necessary)
                print("Waiting for connection to be established...")
                time.sleep(10)

                # Step 3: Set the IP address manually via netsh
                print("Setting IP address for TAP interface...")
                set_ip()

                # Step 4: Wait for 30 seconds before changing the profile
                time.sleep(30)

            except Exception as e:
                print(f"Error with VPN profile {vpn_file}: {e}")
                continue  # Move to the next profile in case of an error

if __name__ == "__main__":
    print('sk;ajda;klda;sdmk')
    # Specify the folder where your VPN profiles (.ovpn files) are stored
    vpn_folder = r"C:\Users\YATIN\Desktop\OpenVPN"  # Replace with the correct path to your profiles folder
    
    # Provide your VPN username and password here
    username = "ginkqlp@exelica.com"
    password = "Vpnpro@11"
    
    # Start cycling through VPN profiles
    cycle_vpn_profiles(vpn_folder, username, password)